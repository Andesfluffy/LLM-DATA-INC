import { NextRequest, NextResponse } from "next/server";
import { toCSV } from "@/lib/csv";
import { getUserFromRequest } from "@/lib/auth-server";
import { findAccessibleDataSource } from "@/lib/userOrg";
import { assertIpAllowlisted, getRequestIp, requireOrgPermission } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLog";
import { getConnector } from "@/lib/connectors/registry";
import { getGuardrails } from "@/lib/connectors/guards";
import "@/lib/connectors/init";
import { z } from "zod";

export async function POST(req: NextRequest) {
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

    const limited = guards.enforceLimit(sql, 10000);
    const result = await client.executeQuery(limited, { timeoutMs: 10000 });
    const csv = toCSV(result.rows);

    await logAuditEvent({
      orgId: org.id,
      userId: dbUser.id,
      action: "report.generated",
      sql: limited,
      targetType: "datasource",
      targetId: ds.id,
      rowCount: result.rows.length,
      metadata: { format: "csv" },
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=export.csv",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  } finally {
    await client.disconnect();
  }
}
