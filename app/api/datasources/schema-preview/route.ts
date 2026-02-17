import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { parseCompactSchema } from "@/lib/schemaParser";
import { blockedEntitlementResponse, resolveOrgEntitlements } from "@/lib/entitlements";
import { ensureUserAndOrg } from "@/lib/userOrg";
import { z } from "zod";

const MAX_TABLES = 50;
const MAX_COLS_PER_TABLE = 50;

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const Body = z.object({
    type: z.string().default("postgres"),
    host: z.string().optional(),
    port: z.coerce.number().int().positive().optional(),
    database: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
  });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, ...params } = parsed.data;
  const { org } = await ensureUserAndOrg(userAuth);
  const entitlements = await resolveOrgEntitlements(org.id);

  if (!entitlements.features.liveDb) {
    return NextResponse.json(
      blockedEntitlementResponse("Live database schema preview", entitlements, "pro"),
      { status: 403 }
    );
  }

  try {
    let ddl = "";

    if (type === "postgres") {
      const { Client } = await import("pg");
      const client = new Client({
        host: params.host,
        port: params.port,
        database: params.database,
        user: params.user,
        password: params.password,
        ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
      });
      try {
        await client.connect();
        await client.query("SET statement_timeout = 10000");
        const result = await client.query(`
          SELECT c.table_schema AS schema, c.table_name AS table, c.column_name AS column, c.data_type
          FROM information_schema.columns c
          JOIN information_schema.tables t
            ON c.table_schema = t.table_schema AND c.table_name = t.table_name
          WHERE t.table_type = 'BASE TABLE'
            AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
          ORDER BY c.table_schema, c.table_name, c.ordinal_position
        `);
        const lines: string[] = [];
        for (const row of result.rows) {
          const prefix = row.schema === "public" ? "" : `${row.schema}.`;
          lines.push(`${prefix}${row.table}.${row.column} ${row.data_type}`);
        }
        ddl = lines.join("\n");
      } finally {
        try { await client.end(); } catch {}
      }
    } else if (type === "mysql") {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection({
        host: params.host || "localhost",
        port: params.port || 3306,
        database: params.database,
        user: params.user,
        password: params.password,
        connectTimeout: 10000,
      });
      try {
        const [rows] = await conn.query(`
          SELECT TABLE_NAME AS \`table\`, COLUMN_NAME AS \`column\`, DATA_TYPE AS data_type
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          ORDER BY TABLE_NAME, ORDINAL_POSITION
        `) as any;
        const lines: string[] = [];
        for (const row of rows) {
          lines.push(`${row.table}.${row.column} ${row.data_type}`);
        }
        ddl = lines.join("\n");
      } finally {
        await conn.end();
      }
    } else {
      return NextResponse.json({ error: "Schema preview not supported for this type" }, { status: 400 });
    }

    let tables = parseCompactSchema(ddl);

    // Limit output size
    tables = tables.slice(0, MAX_TABLES).map((t) => ({
      ...t,
      columns: t.columns.slice(0, MAX_COLS_PER_TABLE),
    }));

    return NextResponse.json({ tables });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch schema preview" },
      { status: 500 }
    );
  }
}
