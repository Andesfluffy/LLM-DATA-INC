import { NextRequest, NextResponse } from "next/server";
import { prisma as appPrisma, getPrismaForUrl } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const search = Object.fromEntries(req.nextUrl.searchParams.entries());
  const Query = z.object({ orgId: z.string().min(1), datasourceId: z.string().min(1) });
  const parsed = Query.safeParse(search);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orgId, datasourceId } = parsed.data;
  const ds = await appPrisma.dataSource.findFirst({ where: { id: datasourceId, orgId } });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });
  const url = ds.url || buildPgUrl(ds);
  const prisma = getPrismaForUrl(url);

  // Use information_schema + pg_catalog for table/column overview
  const tables = await prisma.$queryRawUnsafe(
    `
    SELECT n.nspname as schema, c.relname as table, COALESCE(c2.reltuples::bigint, 0) as row_estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_class c2 ON c2.oid = c.oid
    WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY n.nspname, c.relname;
  `
  );

  const columns = await prisma.$queryRawUnsafe(
    `
    SELECT table_schema as schema, table_name as table, column_name as column, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name, ordinal_position;
  `
  );

  return NextResponse.json({ tables, columns });
}

function buildPgUrl(ds: any) {
  if (!ds?.host || !ds?.database || !ds?.user) return process.env.DEFAULT_DATASOURCE_URL || process.env.DATABASE_URL!;
  const enc = encodeURIComponent;
  const pwd = ds.password ? `:${enc(ds.password)}` : "";
  return `postgresql://${enc(ds.user)}${pwd}@${ds.host}:${ds.port ?? 5432}/${ds.database}`;
}
