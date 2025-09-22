import { NextRequest, NextResponse } from "next/server";
import { prisma as appPrisma, getPrismaForUrl } from "@/lib/db";
import { getSchemaSummary } from "@/lib/schema";
import { openaiClient, pickModel } from "@/lib/openai";
import { validateSql, enforceLimit } from "@/lib/guardrails";
import { getUserFromRequest } from "@/lib/auth-server";
import { z } from "zod";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const Body = z.object({ orgId: z.string().min(1), datasourceId: z.string().min(1), prompt: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orgId, datasourceId, prompt } = parsed.data;

  // Resolve data source URL
  const ds = await appPrisma.dataSource.findFirst({ where: { id: datasourceId || undefined, orgId: orgId || undefined } });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });
  const url = ds.url || buildPgUrl(ds);
  const prisma = getPrismaForUrl(url);
  const schema = await getSchemaSummary(prisma, url);
  const schemaHash = crypto.createHash('sha256').update(schema).digest('hex');

  // NL→SQL cache (30s)
  const key = `${orgId}|${schemaHash}|${crypto.createHash('sha256').update(prompt).digest('hex')}`;
  if (nlCache.has(key)) {
    const item = nlCache.get(key)!;
    if (item.expiresAt > Date.now()) {
      return NextResponse.json({ sql: item.sql });
    }
    nlCache.delete(key);
  }

  const system = `You are a SQL assistant for PostgreSQL. Output ONLY a single SELECT statement.
- Use fully qualified table names only if schemas are not public.
- Prefer simple, readable SQL. Use CTEs only when necessary.
- NEVER modify data. No INSERT/UPDATE/DELETE/DDL.
- Always include an explicit LIMIT 100 if appropriate.`;

  const user = `Schema:
${schema}

Task: Write a single, safe SELECT for:
"""
${prompt}
"""
Output only SQL, no explanations.`;

  let generated = "";
  try {
    const model = pickModel();
    const resp = await openaiClient.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.1,
    });
    generated = (resp.choices?.[0]?.message?.content || "").trim();
  } catch (e: any) {
    // Audit
    await appPrisma.auditLog.create({ data: { orgId: orgId || ds.orgId!, userId: null, question: prompt, sql: null, durationMs: Date.now() - t0, rowCount: null } });
    return NextResponse.json({ error: "LLM error" }, { status: 500 });
  }

  const allowedTables = await getAllowedTables(prisma);
  const guard = validateSql(generated, allowedTables);
  if (!guard.ok) {
    await appPrisma.auditLog.create({ data: { orgId: orgId || ds.orgId!, userId: null, question: prompt, sql: generated, durationMs: Date.now() - t0, rowCount: null } });
    return NextResponse.json({ error: `Guardrails rejected SQL: ${guard.reason}` }, { status: 400 });
  }

  const limited = enforceLimit(generated, 1000);
  await appPrisma.auditLog.create({ data: { orgId: orgId || ds.orgId!, userId: null, question: prompt, sql: limited, durationMs: Date.now() - t0, rowCount: null } });
  nlCache.set(key, { sql: limited, expiresAt: Date.now() + 30_000 });
  return NextResponse.json({ sql: limited });
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

// simple NL→SQL cache
const nlCache = new Map<string, { sql: string; expiresAt: number }>();
