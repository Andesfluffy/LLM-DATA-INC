import { NextRequest, NextResponse } from "next/server";
import { getPrismaForUrl } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth-server";
import { getDataSourceConnectionUrl } from "@/lib/datasourceSecrets";
import { ensureUser, findAccessibleDataSource } from "@/lib/userOrg";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const search = Object.fromEntries(req.nextUrl.searchParams.entries());
  const Query = z.object({ datasourceId: z.string().min(1) });
  const parsed = Query.safeParse(search);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { datasourceId } = parsed.data;
  const { user: dbUser } = await ensureUser(user);
  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });
  let url: string;
  try {
    url = getDataSourceConnectionUrl(ds);
  } catch (error) {
    console.error("Failed to resolve data source connection", error);
    return NextResponse.json({ error: "Data source credentials unavailable" }, { status: 500 });
  }
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
