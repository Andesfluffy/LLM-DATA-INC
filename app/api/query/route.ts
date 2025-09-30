import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Client } from "pg";
import { getSchemaDDL } from "@/src/server/schemaIntrospect";
import { nlToSql } from "@/src/server/generateSql";
import { enforceLimit, isSelectOnly } from "@/src/server/sqlGuard";
import { getUserOrgFromRequest } from "@/lib/auth-server";
import { z } from "zod";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const context = await getUserOrgFromRequest(req);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, org } = context;
  const Body = z.object({ datasourceId: z.string().min(1), question: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { datasourceId, question } = parsed.data;

  const ds = await prisma.dataSource.findUnique({ where: { id: datasourceId } });
  if (!ds || ds.orgId !== org.id || (ds.ownerId && ds.ownerId !== user.id)) {
    return NextResponse.json({ error: "DataSource not found" }, { status: 404 });
  }
  if (ds.type !== "postgres") return NextResponse.json({ error: "Only postgres type supported" }, { status: 400 });

  const client = new Client({
    host: ds.host || undefined,
    port: ds.port || undefined,
    database: ds.database || undefined,
    user: ds.user || undefined,
    password: ds.password || undefined,
    connectionString: ds.url || undefined,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const t0 = Date.now();
  try {
    await client.connect();
    const schemaKey = `${ds.host}:${ds.port}:${ds.database}:${ds.user}`;
    const schema = await getSchemaDDL({ query: (sql: string) => client.query(sql) }, schemaKey);
    const schemaHash = crypto.createHash('sha256').update(schema).digest('hex');
    const cacheKey = `${org.id}|${schemaHash}|${crypto.createHash('sha256').update(question).digest('hex')}`;
    let sqlRaw: string;
    const hit = nlCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      sqlRaw = hit.sql;
    } else {
      sqlRaw = await nlToSql({ question, schema });
      nlCache.set(cacheKey, { sql: sqlRaw, expiresAt: Date.now() + 30_000 });
    }
    if (!isSelectOnly(sqlRaw)) {
      return NextResponse.json({ error: "Generated SQL rejected by guard (only SELECT allowed)." }, { status: 400 });
    }
    const sql = enforceLimit(sqlRaw, 500);
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 10000');
    const result = await client.query(sql);
    await client.query('COMMIT');
    const fields = result.fields?.map((f: any) => f.name) || Object.keys(result.rows?.[0] || {});

    // Insert AuditLog
    const durationMs = Date.now() - t0;
    await prisma.auditLog.create({
      data: {
        orgId: org.id,
        userId: user.id,
        question,
        sql,
        durationMs,
        rowCount: result.rowCount ?? result.rows?.length ?? 0,
      },
    });

    return NextResponse.json({ sql, fields, rows: result.rows });
  } catch (e: any) {
    try { await client.query('ROLLBACK'); } catch {}
    const msg = String(e?.message || e);
    const isTimeout = /statement timeout|canceling statement/i.test(msg);
    return NextResponse.json({ error: isTimeout ? "Query timed out after 10s" : msg }, { status: isTimeout ? 504 : 500 });
  } finally {
    try { await client.end(); } catch {}
  }
}

const nlCache = new Map<string, { sql: string; expiresAt: number }>();
