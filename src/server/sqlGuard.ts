// Only true write/DDL keywords — read-only words like EXPLAIN/SET/SHOW/ANALYZE
// are intentionally excluded because they can appear in column aliases and CTEs.
const FORBIDDEN = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|call|execute|copy|vacuum|listen|unlisten|notify)\b/i;

export function isSelectOnly(sqlInput: string): boolean {
  if (!sqlInput) return false;
  // Strip trailing semicolons — Gemini routinely adds them and they are harmless
  const sql = sqlInput.trim().replace(/;+\s*$/, "");
  // Must begin with SELECT or WITH (CTEs)
  if (!/^(with|select)\s/i.test(sql)) return false;
  // Disallow mid-query semicolons (multiple statements)
  if (sql.includes(";")) return false;
  if (FORBIDDEN.test(sql)) return false;
  return true;
}

export function enforceLimit(sqlInput: string, max = 500): string {
  if (!sqlInput) return sqlInput;
  const sql = sqlInput.trim().replace(/;+\s*$/g, "");
  const hasLimit = /\blimit\s+\d+\b/i.test(sql);
  if (hasLimit) return sql;
  return `${sql} LIMIT ${Math.max(1, max)}`;
}

