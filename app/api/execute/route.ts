import { NextRequest, NextResponse } from "next/server";
import { prisma as appPrisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { getConnector } from "@/lib/connectors/registry";
import { getGuardrails } from "@/lib/connectors/guards";
import "@/lib/connectors/init";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const Body = z.object({ orgId: z.string().min(1), datasourceId: z.string().min(1), sql: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orgId, datasourceId, sql } = parsed.data;
  const { user: dbUser, org } = await ensureUserAndOrg(user);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId, orgId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  const guards = getGuardrails(factory.dialect);
  let limited = sql;

  try {
    const scopedTables = await getPersistedDatasourceScope(ds.id);
    if (!scopedTables.length) {
      return NextResponse.json({ error: "No monitored tables selected for this data source. Update scope in Settings." }, { status: 400 });
    }
    const allowedTables = await client.getAllowedTables(scopedTables);
    const guard = guards.validateSql(sql, allowedTables);
    if (!guard.ok) {
      return NextResponse.json({ error: `Guardrails rejected SQL: ${guard.reason}` }, { status: 400 });
    }

    limited = guards.enforceLimit(sql, 5000);
    const result = await client.executeQuery(limited, { timeoutMs: 10000 });
    await appPrisma.auditLog.create({
      data: {
        orgId: ds.orgId ?? org.id,
        userId: dbUser.id,
        question: "",
        sql: limited,
        durationMs: Date.now() - t0,
        rowCount: result.rowCount,
      },
    });

    return NextResponse.json({ fields: result.fields, rows: result.rows });
  } catch (e: any) {
    await appPrisma.auditLog.create({
      data: {
        orgId: ds.orgId ?? org.id,
        userId: dbUser.id,
        question: "",
        sql: limited,
        durationMs: Date.now() - t0,
        rowCount: null,
      },
    });

    const msg = String(e?.message || e);
    const isTimeout = /statement timeout|canceling statement|max_execution_time|timed out/i.test(msg);
    return NextResponse.json({ error: isTimeout ? "Query timed out after 10s" : "Query failed" }, { status: isTimeout ? 504 : 500 });
  } finally {
    await client.disconnect();
  }
}
