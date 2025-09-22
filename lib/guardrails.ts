const FORBIDDEN = [
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|call|execute|copy|vacuum|analyze|reset|set|show|explain|listen|unlisten|notify)\b/i,
];

export function validateSql(sqlInput: string, allowedTables: string[]): { ok: true } | { ok: false; reason: string } {
  const sql = sqlInput.trim().replace(/;+\s*$/g, "");
  if (!/^with\s|^select\s/i.test(sql)) return { ok: false, reason: "Only SELECT (or WITH ... SELECT) allowed" };
  if (/;/.test(sql)) return { ok: false, reason: "Multiple statements not allowed" };
  for (const r of FORBIDDEN) if (r.test(sql)) return { ok: false, reason: "Statement contains forbidden keywords" };

  // Basic table allowlist: collect tokens after FROM/JOIN
  const tableTokens = new Set<string>();
  const fromJoinRe = /(from|join)\s+([a-zA-Z_][\w\.]*)(?:\s+as\s+\w+|\s+\w+)?/gi;
  let m: RegExpExecArray | null;
  while ((m = fromJoinRe.exec(sql)) !== null) {
    const token = m[2];
    if (!token) continue;
    const base = token.includes(".") ? token : token; // allow public.
    tableTokens.add(base.toLowerCase());
  }
  if (tableTokens.size > 0) {
    const allowedLower = new Set(allowedTables.map((t) => t.toLowerCase()));
    for (const t of tableTokens) {
      const base = t.includes(".") ? t : t; // if schema omitted, assume public
      if (!(allowedLower.has(base) || allowedLower.has(`public.${base}`) || allowedLower.has(base.replace(/^public\./, "")))) {
        return { ok: false, reason: `Table not allowed: ${t}` };
      }
    }
  }
  return { ok: true };
}

export function enforceLimit(sqlInput: string, maxRows: number): string {
  const sql = sqlInput.trim().replace(/;+\s*$/g, "");
  const hasLimit = /\blimit\s+\d+\b/i.test(sql);
  if (hasLimit) return sql;
  return `${sql} LIMIT ${Math.max(1, maxRows)}`;
}

