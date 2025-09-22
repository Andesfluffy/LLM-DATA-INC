import type { PrismaClient } from "@prisma/client";

const cache = new Map<string, { value: string; expiresAt: number }>();

export async function getSchemaSummary(prisma: PrismaClient, cacheKey?: string, ttlMs: number = 5 * 60 * 1000): Promise<string> {
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
  }
  const tables: Array<{ schema: string; table: string }> = await prisma.$queryRawUnsafe(
    `SELECT table_schema as schema, table_name as table
     FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE'
     ORDER BY table_schema, table_name`
  );
  const cols: Array<{ schema: string; table: string; column: string; data_type: string; is_nullable: string }>
    = await prisma.$queryRawUnsafe(
    `SELECT table_schema as schema, table_name as table, column_name as column, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema NOT IN ('pg_catalog','information_schema')
     ORDER BY table_schema, table_name, ordinal_position`
  );
  const lines: string[] = [];
  for (const t of tables) {
    const list = cols.filter(c => c.schema === t.schema && c.table === t.table).map(c => `${c.column} ${c.data_type}${c.is_nullable==='YES'?'?':''}`);
    const name = t.schema === 'public' ? t.table : `${t.schema}.${t.table}`;
    lines.push(`- ${name}(${list.join(', ')})`);
  }
  const out = lines.join('\n');
  if (cacheKey) cache.set(cacheKey, { value: out, expiresAt: Date.now() + ttlMs });
  return out;
}
