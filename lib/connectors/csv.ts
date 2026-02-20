import type { DataSource } from "@prisma/client";
import type { ConnectorClient, ConnectorFactory } from "./types";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

type CsvMetadata = {
  filePath?: string;
  csvBase64?: string;
  storage?: "inline_base64" | "filesystem" | "r2";
  tableName?: string;
  delimiter?: string;
};

type InferredSqliteType = "INTEGER" | "REAL" | "BOOLEAN" | "DATETIME" | "TEXT";

class CsvClient implements ConnectorClient {
  private db: any = null;
  private tableName: string;
  private metadata: CsvMetadata;

  constructor(private ds: DataSource) {
    this.metadata = (ds.metadata as CsvMetadata) || {};
    this.tableName = this.metadata.tableName || "data";
  }

  private async readCsvContent(): Promise<string> {
    if (this.metadata.csvBase64) {
      return Buffer.from(this.metadata.csvBase64, "base64").toString("utf-8");
    }

    if (this.metadata.filePath) {
      // R2 storage
      if (this.metadata.filePath.startsWith("r2://")) {
        const { downloadFromR2, r2KeyFromPath } = await import("@/lib/r2");
        const buf = await downloadFromR2(r2KeyFromPath(this.metadata.filePath));
        return buf.toString("utf-8");
      }
      // Local filesystem (dev/legacy)
      const fullPath = join(process.cwd(), this.metadata.filePath);
      return readFileSync(fullPath, "utf-8");
    }

    throw new Error("No CSV data found. Please re-upload your spreadsheet.");
  }

  private normalizeHeaders(rawHeaders: string[]): string[] {
    const seen = new Map<string, number>();
    return rawHeaders.map((raw, i) => {
      const base = raw
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase() || `column_${i + 1}`;

      const prev = seen.get(base) || 0;
      seen.set(base, prev + 1);
      return prev === 0 ? base : `${base}_${prev + 1}`;
    });
  }

  private parseCsvRows(content: string, delimiter: string): { headers: string[]; rows: string[][] } {
    const parsed = parse(content, {
      bom: true,
      delimiter,
      relax_column_count: true,
      skip_empty_lines: true,
    }) as unknown[];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("CSV file is empty");
    }

    const headerRow = (Array.isArray(parsed[0]) ? parsed[0] : []) as unknown[];
    if (headerRow.length === 0) {
      throw new Error("CSV header row is empty");
    }

    const headers = this.normalizeHeaders(headerRow.map((h) => String(h ?? "")));
    const rows: string[][] = [];

    for (let i = 1; i < parsed.length; i++) {
      const raw = (Array.isArray(parsed[i]) ? parsed[i] : []) as unknown[];
      const normalized: string[] = [];
      for (let col = 0; col < headers.length; col++) {
        normalized.push(String(raw[col] ?? ""));
      }
      rows.push(normalized);
    }

    return { headers, rows };
  }

  private isIntegerToken(value: string): boolean {
    return /^[-+]?\d+$/.test(value.trim());
  }

  private isNumericToken(value: string): boolean {
    const v = value.trim();
    if (!v) return false;
    if (/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(v)) return true;
    return false;
  }

  private isDateToken(value: string): boolean {
    const v = value.trim();
    if (!v || !/[T:\-/\s]/.test(v)) return false;
    const ts = Date.parse(v);
    return Number.isFinite(ts);
  }

  private inferColumnType(values: string[]): InferredSqliteType {
    const nonEmpty = values.map((v) => v.trim()).filter((v) => v.length > 0);
    if (!nonEmpty.length) return "TEXT";

    const lower = nonEmpty.map((v) => v.toLowerCase());
    const boolSet = new Set(["true", "false", "yes", "no", "y", "n", "1", "0"]);
    const allBoolean = lower.every((v) => boolSet.has(v));
    const hasWordBoolean = lower.some((v) => ["true", "false", "yes", "no", "y", "n"].includes(v));

    if (allBoolean && hasWordBoolean) return "BOOLEAN";
    if (nonEmpty.every((v) => this.isIntegerToken(v))) return "INTEGER";
    if (nonEmpty.every((v) => this.isNumericToken(v))) return "REAL";
    if (nonEmpty.every((v) => this.isDateToken(v))) return "DATETIME";

    return "TEXT";
  }

  private inferColumnTypes(rows: string[][], colCount: number): InferredSqliteType[] {
    const sampleSize = Math.min(rows.length, 500);
    const types: InferredSqliteType[] = [];

    for (let col = 0; col < colCount; col++) {
      const values: string[] = [];
      for (let r = 0; r < sampleSize; r++) {
        values.push(String(rows[r]?.[col] ?? ""));
      }
      types.push(this.inferColumnType(values));
    }

    return types;
  }

  private coerceValue(value: string, type: InferredSqliteType): string | number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (type === "INTEGER") {
      const n = Number.parseInt(trimmed, 10);
      return Number.isFinite(n) ? n : null;
    }

    if (type === "REAL") {
      const n = Number.parseFloat(trimmed);
      return Number.isFinite(n) ? n : null;
    }

    if (type === "BOOLEAN") {
      const v = trimmed.toLowerCase();
      return ["true", "yes", "y", "1"].includes(v) ? 1 : 0;
    }

    if (type === "DATETIME") {
      const ts = Date.parse(trimmed);
      return Number.isFinite(ts) ? new Date(ts).toISOString() : trimmed;
    }

    return trimmed;
  }

  private async ensureDb() {
    if (this.db) return this.db;

    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs();
    this.db = new SQL.Database();

    const delimiter = this.metadata.delimiter || ",";
    const content = await this.readCsvContent();
    const { headers, rows } = this.parseCsvRows(content, delimiter);
    const types = this.inferColumnTypes(rows, headers.length);

    const safeCols = headers.map((h) => `"${h.replace(/"/g, '""')}"`);
    const colDefs = safeCols.map((col, i) => `${col} ${types[i]}`).join(", ");
    this.db.run(`CREATE TABLE "${this.tableName}" (${colDefs})`);

    if (rows.length > 0) {
      const insertSql = `INSERT INTO "${this.tableName}" (${safeCols.join(", ")}) VALUES (${safeCols.map(() => "?").join(", ")})`;
      const stmt = this.db.prepare(insertSql);
      try {
        this.db.run("BEGIN");
        for (const row of rows) {
          const coerced = row.map((v, i) => this.coerceValue(String(v ?? ""), types[i]!));
          stmt.run(coerced);
        }
        this.db.run("COMMIT");
      } catch (error) {
        this.db.run("ROLLBACK");
        throw error;
      } finally {
        stmt.free();
      }
    }

    return this.db;
  }

  async testConnection(): Promise<{ ok: boolean; ms: number; error?: string }> {
    const t0 = Date.now();
    try {
      await this.ensureDb();
      return { ok: true, ms: Date.now() - t0 };
    } catch (err: any) {
      return { ok: false, ms: Date.now() - t0, error: err.message || String(err) };
    }
  }

  async getSchema(opts?: { cacheKey?: string; allowedTables?: string[] }): Promise<string> {
    const db = await this.ensureDb();
    const result = db.exec(`PRAGMA table_info("${this.tableName}")`);
    if (!result.length) return "";

    const lines = result[0].values.map(
      (row: any[]) => `${this.tableName}.${row[1]} ${row[2] || "TEXT"}`
    );
    const ddl = lines.join("\n");
    const allowlist = opts?.allowedTables;
    if (!allowlist) return ddl;
    const allowed = new Set(allowlist.map((table) => table.toLowerCase()));
    return ddl
      .split("\n")
      .filter(Boolean)
      .filter((line: string) => allowed.has(line.slice(0, line.lastIndexOf(".")).toLowerCase()))
      .join("\n");
  }

  async getAllowedTables(allowedTables?: string[]): Promise<string[]> {
    const discovered = [this.tableName];
    if (!allowedTables) return discovered;
    const allowed = new Set(allowedTables.map((table) => table.toLowerCase()));
    return discovered.filter((table) => allowed.has(String(table).toLowerCase()));
  }

  async executeQuery(
    sql: string,
    opts?: { limit?: number; timeoutMs?: number }
  ) {
    const db = await this.ensureDb();
    let finalSql = sql.trim();
    if (opts?.limit && !/\blimit\s+\d+\b/i.test(finalSql)) {
      finalSql += ` LIMIT ${opts.limit}`;
    }

    const result = db.exec(finalSql);

    if (!result.length) {
      return { fields: [], rows: [], rowCount: 0 };
    }

    const columns = result[0].columns as string[];
    const rows = result[0].values.map((vals: any[]) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        row[col] = vals[i];
      });
      return row;
    });

    return { fields: columns, rows, rowCount: rows.length };
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // ignore
      }
      this.db = null;
    }
  }
}

export const csvConnector: ConnectorFactory = {
  type: "csv",
  displayName: "Spreadsheet Upload",
  dialect: "sqlite",

  async createClient(ds: DataSource): Promise<ConnectorClient> {
    return new CsvClient(ds);
  },

  validateParams(params: Record<string, unknown>) {
    const errors: string[] = [];
    const meta = params.metadata as CsvMetadata | undefined;
    if (!meta?.csvBase64 && !meta?.filePath) {
      errors.push("CSV content is required");
    }
    return errors.length ? { ok: false as const, errors } : { ok: true as const };
  },
};
