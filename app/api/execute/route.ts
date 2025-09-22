import { NextRequest, NextResponse } from "next/server";
import { prisma as appPrisma, getPrismaForUrl } from "@/lib/db";
import { validateSql, enforceLimit } from "@/lib/guardrails";
import { getUserFromRequest } from "@/lib/auth-server";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const Body = z.object({ orgId: z.string().min(1), datasourceId: z.string().min(1), sql: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orgId, datasourceId, sql } = parsed.data;

  const ds = await appPrisma.dataSource.findFirst({ where: { id: datasourceId || undefined, orgId: orgId || undefined } });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });
  const url = ds.url || buildPgUrl(ds);
  const prisma = getPrismaForUrl(url);

  const allowedTables = await getAllowedTables(prisma);
  const guard = validateSql(sql, allowedTables);
  if (!guard.ok) return NextResponse.json({ error: `Guardrails rejected SQL: ${guard.reason}` }, { status: 400 });
  const limited = enforceLimit(sql, 5000);
  try {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = 10000`);
      const r = await tx.$queryRawUnsafe<any[]>(limited);
      return r;
    });
    await appPrisma.auditLog.create({ data: { orgId: orgId || ds.orgId!, userId: null, question: "", sql: limited, durationMs: Date.now() - t0, rowCount: rows.length } });
    return NextResponse.json({ rows });
  } catch (e: any) {
    await appPrisma.auditLog.create({ data: { orgId: orgId || ds.orgId!, userId: null, question: "", sql: limited, durationMs: Date.now() - t0, rowCount: null } });
    const msg = String(e?.message || e);
    const isTimeout = /statement timeout|canceling statement/i.test(msg);
    return NextResponse.json({ error: isTimeout ? "Query timed out after 10s" : "Query failed" }, { status: isTimeout ? 504 : 500 });
  }
}

async function getAllowedTables(prisma: any): Promise<string[]> {
  const rows: Array<{ schema: string; table: string }> = await prisma.$queryRawUnsafe(
    `SELECT table_schema as schema, table_name as table
     FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog','information_schema')
       AND table_type = 'BASE TABLE'`
  );
  return rows.map((r) => (r.schema === 'public' ? r.table : `${r.schema}.${r.table}`));
}

function buildPgUrl(ds: any) {
  if (!ds?.host || !ds?.database || !ds?.user) return process.env.DEFAULT_DATASOURCE_URL || process.env.DATABASE_URL!;
  const enc = encodeURIComponent;
  const pwd = ds.password ? `:${enc(ds.password)}` : "";
  return `postgresql://${enc(ds.user)}${pwd}@${ds.host}:${ds.port ?? 5432}/${ds.database}`;
}
