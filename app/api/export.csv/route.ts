import { NextRequest, NextResponse } from "next/server";
import { prisma as appPrisma, getPrismaForUrl } from "@/lib/db";
import { validateSql, enforceLimit } from "@/lib/guardrails";
import { toCSV } from "@/lib/csv";
import { getUserFromRequest } from "@/lib/auth-server";
import { getDataSourceConnectionUrl } from "@/lib/datasourceSecrets";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const Body = z.object({ orgId: z.string().min(1), datasourceId: z.string().min(1), sql: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orgId, datasourceId, sql } = parsed.data;
  const { user: dbUser } = await ensureUserAndOrg(user);
  if (!sql) return NextResponse.json({ error: "Missing sql" }, { status: 400 });

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId, orgId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });
  let url: string;
  try {
    url = getDataSourceConnectionUrl(ds);
  } catch (error) {
    console.error("Failed to resolve data source connection", error);
    return NextResponse.json({ error: "Data source credentials unavailable" }, { status: 500 });
  }
  const prisma = getPrismaForUrl(url);
  const allowedTables = await getAllowedTables(prisma);
  const guard = validateSql(sql, allowedTables);
  if (!guard.ok) return NextResponse.json({ error: `Guardrails rejected SQL: ${guard.reason}` }, { status: 400 });

  const limited = enforceLimit(sql, 10000);
  const rows = await prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = 10000`);
    return tx.$queryRawUnsafe(limited) as any[];
  });
  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=export.csv`
    }
  });
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
