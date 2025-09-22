const FORBIDDEN = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|call|execute|copy|vacuum|analyze|reset|set|show|explain|listen|unlisten|notify)\b/i;

export function isSelectOnly(sqlInput: string): boolean {
  if (!sqlInput) return false;
  const sql = sqlInput.trim();
  // Single statement, begins with SELECT or WITH
  if (!/^(with|select)\s/i.test(sql)) return false;
  if (sql.includes(";")) return false; // disallow multiple statements
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

