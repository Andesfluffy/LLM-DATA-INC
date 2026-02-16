import { validateSql, enforceLimit } from "@/lib/guardrails";
import { isSelectOnly } from "@/src/server/sqlGuard";

export type Dialect = "postgresql" | "mysql" | "sqlite";

export function getGuardrails(_dialect: Dialect) {
  return {
    isSelectOnly(sql: string): boolean {
      return isSelectOnly(sql);
    },

    validateSql(sql: string, allowedTables: string[]) {
      return validateSql(sql, allowedTables);
    },

    enforceLimit(sql: string, maxRows: number): string {
      return enforceLimit(sql, maxRows);
    },
  };
}
