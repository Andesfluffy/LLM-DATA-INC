import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma as appPrisma } from "@/lib/db";
import { nlToSql } from "@/src/server/generateSql";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser, findAccessibleDataSource } from "@/lib/userOrg";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { getConnector } from "@/lib/connectors/registry";
import { getGuardrails } from "@/lib/connectors/guards";
import { logAuditEvent } from "@/lib/auditLog";
import "@/lib/connectors/init";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export type ChartConfig = {
  type: "bar" | "bar-horizontal" | "line" | "area" | "pie" | "number";
  xKey: string;
  yKey: string;
  title: string;
};

export type AnalyzeResponse =
  | { offTopic: true; reason: string }
  | {
      sql: string;
      fields: string[];
      rows: Record<string, unknown>[];
      insight: string;
      chart: ChartConfig | null;
    };

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const Body = z.object({ datasourceId: z.string().min(1), prompt: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { datasourceId, prompt } = parsed.data;
  const { user: dbUser } = await ensureUser(user);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  const guards = getGuardrails(factory.dialect);

  try {
    const scopedTables = await getPersistedDatasourceScope(ds.id);
    if (!scopedTables.length) {
      return NextResponse.json(
        { error: "No monitored tables selected. Update scope in Settings." },
        { status: 400 }
      );
    }

    const schemaKey = `${ds.id}:${ds.type}`;
    const schema = await client.getSchema({ cacheKey: schemaKey, allowedTables: scopedTables });

    // ── Step 1: Generate SQL ────────────────────────────────────────────────
    const generated = await nlToSql({ question: prompt, schema, dialect: factory.dialect });

    if (generated.startsWith("OFFTOPIC:")) {
      const reason = generated.slice("OFFTOPIC:".length).trim();
      await appPrisma.queryAudit.create({
        data: {
          userId: dbUser.id,
          dataSourceId: ds.id,
          nlQuery: prompt,
          status: "off_topic",
          durationMs: Date.now() - t0,
        },
      });
      return NextResponse.json({ offTopic: true, reason } satisfies AnalyzeResponse);
    }

    if (!guards.isSelectOnly(generated)) {
      return NextResponse.json(
        { error: "Only read-only SELECT queries are allowed" },
        { status: 400 }
      );
    }

    const allowedTables = await client.getAllowedTables(scopedTables);
    const guard = guards.validateSql(generated, allowedTables);
    if (!guard.ok) {
      return NextResponse.json(
        { error: `Guardrails rejected SQL: ${guard.reason}` },
        { status: 400 }
      );
    }

    const sql = guards.enforceLimit(generated, 1000);

    // ── Step 2: Execute ─────────────────────────────────────────────────────
    const result = await client.executeQuery(sql, { timeoutMs: 10_000 });
    const { fields, rows, rowCount } = result;

    await logAuditEvent({
      userId: dbUser.id,
      action: "report.executed",
      question: prompt,
      sql,
      durationMs: Date.now() - t0,
      rowCount,
      targetType: "datasource",
      targetId: ds.id,
    });

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        sql,
        fields,
        rows: [],
        insight: "The query returned no results for this filter.",
        chart: null,
      } satisfies AnalyzeResponse);
    }

    // ── Step 3: Analyze ─────────────────────────────────────────────────────
    // Cap sample at 60 rows to keep the analysis prompt small
    const sample = rows.slice(0, 60);
    const csvHeader = fields.join(", ");
    const csvRows = sample
      .map((r) => fields.map((f) => String(r[f] ?? "")).join(", "))
      .join("\n");
    const rowsText = `${csvHeader}\n${csvRows}`;

    const analysisResp = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a senior data analyst. Given a user question and query results, provide:
1. "insight": 2-4 sentence plain-English summary using SPECIFIC numbers from the data. Always name the highest, lowest, and any striking comparisons or trends the question asks about. Be concrete — include actual values.
2. "chart": the single best visualisation for this answer.

Chart type selection (choose the MOST informative):
- "number"        → single-row / single-metric (total count, average, ratio)
- "bar-horizontal" → category comparisons where category names are long (counties, cities, states, product names >8 chars) OR there are more than 8 categories
- "bar"            → category comparisons with short labels and ≤ 8 categories
- "line"           → time-series (xKey is date / month / year / week)
- "area"           → cumulative or running-total time-series; trend emphasis
- "pie"            → part-of-whole with ≤ 6 categories; each slice > 5%

Rules:
- xKey and yKey MUST exactly match column names in the result
- For "number", yKey is the metric column in row 0; xKey can be empty string
- Default to "bar-horizontal" for geographic/named-entity comparisons (counties, regions, departments)

Respond ONLY with valid JSON: {"insight":"...","chart":{"type":"bar"|"bar-horizontal"|"line"|"area"|"pie"|"number","xKey":"col","yKey":"col","title":"..."}}`,
        },
        {
          role: "user",
          content: `QUESTION: ${prompt}\n\nRESULTS (${rows.length} total rows${rows.length > 60 ? "; showing first 60" : ""}):\n${rowsText}`,
        },
      ],
    });

    const raw = analysisResp.choices?.[0]?.message?.content ?? "{}";
    let chart: ChartConfig | null = null;
    let insight = "Query completed successfully.";

    try {
      const parsed = JSON.parse(raw) as { insight?: string; chart?: ChartConfig };
      insight = parsed.insight ?? insight;

      // Validate chart keys exist in actual fields before accepting
      const VALID_TYPES = new Set(["bar", "bar-horizontal", "line", "area", "pie", "number"]);
      if (parsed.chart && VALID_TYPES.has(parsed.chart.type)) {
        const isNumber = parsed.chart.type === "number";
        const keysOk =
          isNumber
            ? fields.includes(parsed.chart.yKey)
            : fields.includes(parsed.chart.xKey) && fields.includes(parsed.chart.yKey);
        if (keysOk) chart = parsed.chart;
      }
    } catch {
      // leave defaults
    }

    return NextResponse.json({ sql, fields, rows, insight, chart } satisfies AnalyzeResponse);
  } catch (e: unknown) {
    await appPrisma.queryAudit.create({
      data: { userId: dbUser.id, nlQuery: prompt, status: "error", durationMs: Date.now() - t0 },
    });
    const msg = String((e as Error)?.message ?? e);
    const isTimeout = /statement timeout|canceling statement|max_execution_time|timed out/i.test(msg);
    return NextResponse.json(
      { error: isTimeout ? "Query timed out after 10s" : "Failed to analyze query" },
      { status: isTimeout ? 504 : 500 }
    );
  } finally {
    await client.disconnect();
  }
}
