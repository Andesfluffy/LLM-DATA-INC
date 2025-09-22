export type QueryClient = {
  query?: (sql: string) => Promise<{ rows: any[] } | any> | { rows: any[] } | any;
  $queryRawUnsafe?: <T = any[]>(sql: string) => Promise<T>;
};

async function runQuery(client: QueryClient, sql: string): Promise<any[]> {
  if (typeof client?.$queryRawUnsafe === "function") {
    return await client.$queryRawUnsafe<any[]>(sql);
  }
  if (typeof client?.query === "function") {
    const res = await client.query(sql as any);
    if (res?.rows) return res.rows;
    return Array.isArray(res) ? res : [];
  }
  throw new Error("Unsupported client: missing query method");
}

// simple in-memory cache with TTL
const cache = new Map<string, { value: string; expiresAt: number }>();

// Returns a compact string: "schema.table.column datatype" per line
export async function getSchemaDDL(client: QueryClient, cacheKey?: string, ttlMs: number = 5 * 60 * 1000): Promise<string> {
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
  }
  const rows = await runQuery(
    client,
    `SELECT table_schema AS schema, table_name AS table, column_name AS column, data_type
     FROM information_schema.columns
     WHERE table_schema NOT IN ('pg_catalog','information_schema')
     ORDER BY table_schema, table_name, ordinal_position`
  );
  const lines: string[] = [];
  for (const r of rows) {
    const schema = r.schema || r.table_schema || "public";
    const table = r.table || r.table_name;
    const column = r.column || r.column_name;
    const type = r.data_type;
    const name = schema === "public" ? `${table}.${column}` : `${schema}.${table}.${column}`;
    lines.push(`${name} ${type}`);
  }
  const out = lines.join("\n");
  if (cacheKey) cache.set(cacheKey, { value: out, expiresAt: Date.now() + ttlMs });
  return out;
}
