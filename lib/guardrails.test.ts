import { describe, expect, it } from 'vitest';

import { validateSql } from './guardrails';

describe('validateSql table allowlist', () => {
  it('rejects disallowed quoted tables', () => {
    const result = validateSql('SELECT * FROM "pg_catalog"."pg_authid"', ['public.safe_table']);
    expect(result).toEqual({ ok: false, reason: 'Table not allowed: "pg_catalog"."pg_authid"' });
  });

  it('allows quoted tables present in the allowlist', () => {
    const result = validateSql('SELECT * FROM "Public"."My_Table" AS t', ['public.my_table']);
    expect(result).toEqual({ ok: true });
  });

  it('handles doubled quotes inside identifiers', () => {
    const result = validateSql('SELECT * FROM "My""Schema"."My""Table"', ['"My""Schema"."My""Table"']);
    expect(result).toEqual({ ok: true });
  });

  it('allows MySQL backtick-quoted tables present in allowlist', () => {
    const result = validateSql('SELECT * FROM `sales_db`.`orders`', ['sales_db.orders']);
    expect(result).toEqual({ ok: true });
  });

  it('rejects MySQL backtick-quoted tables not in allowlist', () => {
    const result = validateSql('SELECT * FROM `mysql`.`user`', ['sales_db.orders']);
    expect(result).toEqual({ ok: false, reason: 'Table not allowed: `mysql`.`user`' });
  });
});
