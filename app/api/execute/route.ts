import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { findAccessibleDataSource } from "@/lib/userOrg";
import { getConnector } from "@/lib/connectors/registry";
import { getGuardrails } from "@/lib/connectors/guards";
import { assertIpAllowlisted, getRequestIp, requireOrgPermission } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLog";
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
  const access = await requireOrgPermission(user, "reporting:run", orgId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user: dbUser, org } = access;
  if (!(await assertIpAllowlisted(org.id, getRequestIp(req.headers)))) {
    return NextResponse.json({ error: "IP address not allowed" }, { status: 403 });
  }

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId, orgId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  const guards = getGuardrails(factory.dialect);
  let limited = sql;

  try {
    const allowedTables = await client.getAllowedTables();
    const guard = guards.validateSql(sql, allowedTables);
    if (!guard.ok) {
      return NextResponse.json({ error: `Guardrails rejected SQL: ${guard.reason}` }, { status: 400 });
    }

    limited = guards.enforceLimit(sql, 5000);
    const result = await client.executeQuery(limited, { timeoutMs: 10000 });
    await logAuditEvent({ orgId: ds.orgId ?? org.id, userId: dbUser.id, action: "report.executed", question: "", sql: limited, durationMs: Date.now() - t0, rowCount: result.rowCount, targetType: "datasource", targetId: ds.id });

    return NextResponse.json({ fields: result.fields, rows: result.rows });
  } catch (e: any) {
    await logAuditEvent({ orgId: ds.orgId ?? org.id, userId: dbUser.id, action: "report.execute_failed", question: "", sql: limited, durationMs: Date.now() - t0, rowCount: null, targetType: "datasource", targetId: ds.id });

    const msg = String(e?.message || e);
    const isTimeout = /statement timeout|canceling statement|max_execution_time|timed out/i.test(msg);
    return NextResponse.json({ error: isTimeout ? "Query timed out after 10s" : "Query failed" }, { status: isTimeout ? 504 : 500 });
  } finally {
    await client.disconnect();
  }
}
