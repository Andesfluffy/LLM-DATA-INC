import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth-server";
import { buildDatasetOverviewResult, isDatasetOverviewQuestion } from "@/lib/datasetOverview";
import { getGuardrails } from "@/lib/connectors/guards";
import { getConnector } from "@/lib/connectors/registry";
import { ensureUser, findAccessibleDataSource } from "@/lib/userOrg";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { logAuditEvent } from "@/lib/auditLog";
import { nlToSql } from "@/src/server/generateSql";
import { isAnalyticalQuestion } from "@/lib/deepAnalysis";
import "@/lib/connectors/init";

const HistoryTurn = z.object({ question: z.string().max(500), sql: z.string().max(2000) });
const Body = z.object({
  datasourceId: z.string().min(1),
  question: z.string().min(1),
  history: z.array(HistoryTurn).max(5).optional(),
});

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) {
    return NextResponse.json(
      { error: "Please sign in to ask questions about your data." },
      { status: 401 }
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { datasourceId, question, history } = parsed.data;
  const { user: dbUser } = await ensureUser(userAuth);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId });
  if (!ds) {
    return NextResponse.json(
      { error: "No data source found. Please connect a database or upload a CSV/Excel file in Settings first." },
      { status: 404 }
    );
  }

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  const guards = getGuardrails(factory.dialect);

  const t0 = Date.now();

  try {
    const scopedTables = await getPersistedDatasourceScope(ds.id);
    if (!scopedTables.length) {
      return NextResponse.json({ error: "No monitored tables selected for this data source. Update scope in Settings." }, { status: 400 });
    }
    const schemaKey = `${ds.id}:${ds.type}`;
    const schema = await client.getSchema({ cacheKey: schemaKey, allowedTables: scopedTables });

    // Analytical path: question requires reasoning, predictions, or recommendations — not a SQL result.
    if (isAnalyticalQuestion(question)) {
      return NextResponse.json({ analysisMode: true });
    }

    // Non-technical path: return a direct schema overview.
    if (isDatasetOverviewQuestion(question)) {
      const overview = buildDatasetOverviewResult(schema);
      const sql = "-- DATASET OVERVIEW (schema-based)";
      const durationMs = Date.now() - t0;

      await logAuditEvent({ userId: dbUser.id, action: "report.generated", question, sql, durationMs, rowCount: overview.rowCount, targetType: "datasource", targetId: ds.id });

      return NextResponse.json({ sql, fields: overview.fields, rows: overview.rows });
    }

    const schemaHash = crypto.createHash("sha256").update(schema).digest("hex");
    const historyHash = history?.length
      ? crypto.createHash("sha256").update(JSON.stringify(history)).digest("hex").slice(0, 8)
      : "";
    const cacheKey = `${ds.id}|${schemaHash}|${historyHash}|${crypto
      .createHash("sha256")
      .update(question)
      .digest("hex")}`;

    let sqlRaw: string;
    const hit = nlCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      sqlRaw = hit.sql;
    } else {
      sqlRaw = await nlToSql({
        question,
        schema,
        dialect: factory.dialect,
        conversationHistory: history,
      });
      nlCache.set(cacheKey, { sql: sqlRaw, expiresAt: Date.now() + 30_000 });
    }

    // Off-topic: nlToSql signals the question doesn't match the schema
    if (sqlRaw.startsWith("OFFTOPIC:")) {
      const reason = sqlRaw.slice("OFFTOPIC:".length).trim();
      // Extract table names from schema to surface as context for suggestions
      const tableNames = schema
        .split("\n")
        .map((line) => line.trim().split(".")[0])
        .filter((t): t is string => Boolean(t))
        .reduce<string[]>((acc, t) => (acc.includes(t) ? acc : [...acc, t]), [])
        .slice(0, 5);
      return NextResponse.json({
        offTopic: true,
        reason: reason || "This question doesn't appear to match the data in your connected source.",
        availableTables: tableNames,
      });
    }

    if (!guards.isSelectOnly(sqlRaw)) {
      return NextResponse.json(
        {
          error:
            "For safety, Data Vista can only read your data - it cannot make changes. Try rephrasing your question as a data lookup.",
        },
        { status: 400 }
      );
    }

    const allowedTables = await client.getAllowedTables(scopedTables);
    const guardResult = guards.validateSql(sqlRaw, allowedTables);
    if (!guardResult.ok) {
      return NextResponse.json(
        {
          error:
            "Your question referenced data we could not find in your database. Try rephrasing, or check that the right data source is connected.",
        },
        { status: 400 }
      );
    }

    const sql = guards.enforceLimit(sqlRaw, 500);
    const result = await client.executeQuery(sql, { timeoutMs: 10000 });

    const durationMs = Date.now() - t0;
    await logAuditEvent({ userId: dbUser.id, action: "report.generated", question, sql, durationMs, rowCount: result.rowCount, targetType: "datasource", targetId: ds.id });

    return NextResponse.json({ sql, fields: result.fields, rows: result.rows });
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("[query] Error for datasource", datasourceId, ":", msg, e?.stack || "");
    const isTimeout = /statement timeout|canceling statement|max_execution_time|timed? ?out/i.test(msg);
    const isConnection = /ECONNREFUSED|ENOTFOUND|ENOENT|ETIMEDOUT|connection refused|connect ECONNREFUSED|no such file or directory/i.test(msg);
    const isSyntax = /syntax error|column .* does not exist|relation .* does not exist|undefined column|no such column|no such table|near ".*?": |sqlite_error|table .* not found/i.test(msg);
    const isAiService = /401|403|429|rate.?limit|quota.*exceeded|insufficient_quota|gemini|api.?key|authentication/i.test(msg);

    let friendlyMsg: string;
    if (isTimeout) {
      friendlyMsg = "Your question required a query that took too long to run. Try asking something more specific or narrowing the date range.";
    } else if (isAiService) {
      friendlyMsg = "The AI service is temporarily unavailable or the API key needs to be checked. Please try again in a moment.";
    } else if (isConnection) {
      friendlyMsg = "We could not reach your data source. Please check that it is configured correctly in Settings.";
    } else if (isSyntax) {
      friendlyMsg = "The AI generated a query that did not work with your data. Try rephrasing your question with different wording.";
    } else {
      friendlyMsg = "Something went wrong while running your query. Try rephrasing your question, or check your data source settings.";
    }

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { error: friendlyMsg, ...(isDev && { debug: msg }) },
      { status: isTimeout ? 504 : 500 }
    );
  } finally {
    await client.disconnect();
  }
}

const nlCache = new Map<string, { sql: string; expiresAt: number }>();
