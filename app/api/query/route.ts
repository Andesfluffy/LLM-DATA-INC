import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { buildDatasetOverviewResult, isDatasetOverviewQuestion } from "@/lib/datasetOverview";
import { getGlossaryContext } from "@/lib/glossary";
import { getGuardrails } from "@/lib/connectors/guards";
import { getConnector } from "@/lib/connectors/registry";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { nlToSql } from "@/src/server/generateSql";
import "@/lib/connectors/init";

const HistoryTurn = z.object({ question: z.string().max(500), sql: z.string().max(2000) });
const Body = z.object({
  orgId: z.string().min(1),
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

  const { orgId, datasourceId, question, history } = parsed.data;
  const { user: dbUser, org } = await ensureUserAndOrg(userAuth);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId, orgId });
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
  const resolvedOrgId = ds.orgId ?? org.id;

  try {
    const schemaKey = `${ds.id}:${ds.type}`;
    const schema = await client.getSchema(schemaKey);

    // Non-technical path: return a direct schema overview.
    if (isDatasetOverviewQuestion(question)) {
      const overview = buildDatasetOverviewResult(schema);
      const sql = "-- DATASET OVERVIEW (schema-based)";
      const durationMs = Date.now() - t0;

      await Promise.all([
        prisma.auditLog.create({
          data: {
            orgId: resolvedOrgId,
            userId: dbUser.id,
            question,
            sql,
            durationMs,
            rowCount: overview.rowCount,
          },
        }),
        prisma.savedQuery.create({
          data: {
            orgId: resolvedOrgId,
            userId: dbUser.id,
            question,
            sql,
          },
        }),
      ]);

      return NextResponse.json({ sql, fields: overview.fields, rows: overview.rows });
    }

    const glossaryCtx = await getGlossaryContext(resolvedOrgId);
    const schemaHash = crypto.createHash("sha256").update(schema).digest("hex");
    const glossaryHash = glossaryCtx
      ? crypto.createHash("sha256").update(glossaryCtx).digest("hex").slice(0, 8)
      : "";
    const historyHash = history?.length
      ? crypto.createHash("sha256").update(JSON.stringify(history)).digest("hex").slice(0, 8)
      : "";
    const cacheKey = `${resolvedOrgId}|${schemaHash}|${glossaryHash}|${historyHash}|${crypto
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
        orgContext: glossaryCtx || undefined,
        dialect: factory.dialect,
        conversationHistory: history,
      });
      nlCache.set(cacheKey, { sql: sqlRaw, expiresAt: Date.now() + 30_000 });
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

    const allowedTables = await client.getAllowedTables();
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
    await Promise.all([
      prisma.auditLog.create({
        data: {
          orgId: resolvedOrgId,
          userId: dbUser.id,
          question,
          sql,
          durationMs,
          rowCount: result.rowCount,
        },
      }),
      prisma.savedQuery.create({
        data: {
          orgId: resolvedOrgId,
          userId: dbUser.id,
          question,
          sql,
        },
      }),
    ]);

    return NextResponse.json({ sql, fields: result.fields, rows: result.rows });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const isTimeout = /statement timeout|canceling statement|max_execution_time/i.test(msg);
    const isConnection = /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection refused|connect ECONNREFUSED/i.test(msg);
    const isSyntax = /syntax error|column .* does not exist|relation .* does not exist|undefined column/i.test(msg);

    let friendlyMsg: string;
    if (isTimeout) {
      friendlyMsg = "Your question required a query that took too long to run. Try asking something more specific or narrowing the date range.";
    } else if (isConnection) {
      friendlyMsg = "We could not reach your database. Please check that your data source is configured correctly in Settings.";
    } else if (isSyntax) {
      friendlyMsg = "The AI generated a query that did not work with your database. Try rephrasing your question with different wording.";
    } else {
      friendlyMsg = "Something went wrong while running your query. Try rephrasing your question, or check your data source settings.";
    }

    return NextResponse.json({ error: friendlyMsg }, { status: isTimeout ? 504 : 500 });
  } finally {
    await client.disconnect();
  }
}

const nlCache = new Map<string, { sql: string; expiresAt: number }>();
