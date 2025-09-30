const FORBIDDEN = [
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|call|execute|copy|vacuum|analyze|reset|set|show|explain|listen|unlisten|notify)\b/i,
];

const IDENTIFIER_PATTERN_SOURCE = '"(?:""|[^"])*"|[a-zA-Z_][\\w$]*';

function normalizeIdentifier(identifier: string): string {
  let trimmed = identifier.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed.toLowerCase();
}

function getIdentifierParts(value: string): string[] | null {
  return value.match(new RegExp(IDENTIFIER_PATTERN_SOURCE, 'g'));
}

function normalizeTableIdentifier(identifier: string): string {
  const parts = getIdentifierParts(identifier);
  if (!parts) return normalizeIdentifier(identifier);
  return parts.map((part) => normalizeIdentifier(part)).join('.');
}

export function validateSql(sqlInput: string, allowedTables: string[]): { ok: true } | { ok: false; reason: string } {
  const sql = sqlInput.trim().replace(/;+\s*$/g, "");
  if (!/^with\s|^select\s/i.test(sql)) return { ok: false, reason: "Only SELECT (or WITH ... SELECT) allowed" };
  if (/;/.test(sql)) return { ok: false, reason: "Multiple statements not allowed" };
  for (const r of FORBIDDEN) if (r.test(sql)) return { ok: false, reason: "Statement contains forbidden keywords" };

  // Basic table allowlist: collect tokens after FROM/JOIN
  const tableTokens = new Map<string, string>();
  const fromJoinRe = /\b(from|join)\b/gi;
  const tablePattern = new RegExp(
    `^\\s*(?:${IDENTIFIER_PATTERN_SOURCE})(?:\\s*\\.\\s*(?:${IDENTIFIER_PATTERN_SOURCE}))?`,
  );
  let m: RegExpExecArray | null;
  while ((m = fromJoinRe.exec(sql)) !== null) {
    const rest = sql.slice(fromJoinRe.lastIndex);
    const tableMatch = rest.match(tablePattern);
    if (!tableMatch) continue;
    const raw = tableMatch[0]!.trim();
    const identifiers = getIdentifierParts(raw);
    if (!identifiers || identifiers.length === 0) continue;
    const normalizedParts = identifiers.map((part) => normalizeIdentifier(part));
    const normalized = normalizedParts.join('.');
    if (!tableTokens.has(normalized)) {
      tableTokens.set(normalized, raw.trim());
    }
  }
  if (tableTokens.size > 0) {
    const allowedLower = new Set(allowedTables.map((t) => normalizeTableIdentifier(t)));
    for (const [normalized, raw] of tableTokens) {
      const hasSchema = normalized.includes('.');
      const tableOnly = normalized.split('.').pop()!;
      const candidates = new Set<string>([tableOnly, `public.${tableOnly}`]);
      if (hasSchema) {
        candidates.add(normalized);
        if (normalized.startsWith('public.')) {
          candidates.add(normalized.slice('public.'.length));
        }
      }

      let allowed = false;
      for (const candidate of candidates) {
        if (allowedLower.has(candidate)) {
          allowed = true;
          break;
        }
      }

      if (!allowed) {
        return { ok: false, reason: `Table not allowed: ${raw}` };
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
