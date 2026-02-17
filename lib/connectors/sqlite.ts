import type { DataSource } from "@prisma/client";
import type { ConnectorClient, ConnectorFactory } from "./types";

// Schema cache (5-minute TTL)
const schemaCache = new Map<string, { ddl: string; expiresAt: number }>();
const SCHEMA_TTL = 5 * 60 * 1000;

class SqliteClient implements ConnectorClient {
  private db: any = null;
  private ds: DataSource;

  constructor(ds: DataSource) {
    this.ds = ds;
  }

  private async getConnection() {
    if (this.db) return this.db;

    // Dynamic import — better-sqlite3 may not be installed yet
    const Database = (await import("better-sqlite3")).default;

    // SQLite uses the 'database' field as the file path
    const dbPath = this.ds.database || ":memory:";
    this.db = new Database(dbPath, { readonly: false });

    return this.db;
  }

  async testConnection(): Promise<{ ok: boolean; ms: number; error?: string }> {
    const t0 = Date.now();
    try {
      const db = await this.getConnection();
      db.prepare("SELECT 1").get();
      return { ok: true, ms: Date.now() - t0 };
    } catch (err: any) {
      return { ok: false, ms: Date.now() - t0, error: err.message || String(err) };
    }
  }

  async getSchema(opts?: { cacheKey?: string; allowedTables?: string[] }): Promise<string> {
    const key = opts?.cacheKey || this.ds.database || "sqlite";
    const cached = schemaCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      const allowlist = opts?.allowedTables;
      if (!allowlist) return cached.ddl;
      const allowed = new Set(allowlist.map((table) => table.toLowerCase()));
      return cached.ddl
        .split("\n")
        .filter(Boolean)
        .filter((line) => allowed.has(line.slice(0, line.lastIndexOf(".")).toLowerCase()))
        .join("\n");
    }

    const db = await this.getConnection();

    // Get all tables
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];

    const lines: string[] = [];
    for (const { name: tableName } of tables) {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as {
        name: string;
        type: string;
      }[];

      for (const col of columns) {
        lines.push(`${tableName}.${col.name} ${col.type.toLowerCase()}`);
      }
    }

    const ddl = lines.join("\n");
    schemaCache.set(key, { ddl, expiresAt: Date.now() + SCHEMA_TTL });

    const allowlist = opts?.allowedTables;
    if (!allowlist) return ddl;
    const allowed = new Set(allowlist.map((table) => table.toLowerCase()));
    return ddl
      .split("\n")
      .filter(Boolean)
      .filter((line) => allowed.has(line.slice(0, line.lastIndexOf(".")).toLowerCase()))
      .join("\n");
  }

  async getAllowedTables(allowedTables?: string[]): Promise<string[]> {
    const db = await this.getConnection();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const discovered = tables.map((t) => t.name);
    if (!allowedTables) return discovered;
    const allowed = new Set(allowedTables.map((table) => table.toLowerCase()));
    return discovered.filter((table) => allowed.has(String(table).toLowerCase()));
  }

  async executeQuery(
    sql: string,
    opts?: { limit?: number; timeoutMs?: number }
  ) {
    const db = await this.getConnection();

    // Apply limit if specified
    let finalSql = sql.trim();
    if (opts?.limit && !finalSql.toLowerCase().includes("limit")) {
      finalSql += ` LIMIT ${opts.limit}`;
    }

    const stmt = db.prepare(finalSql);
    const rows = stmt.all() as Record<string, unknown>[];

    // Extract field names from the first row or statement columns
    const firstRow = rows[0];
    const fieldNames = firstRow ? Object.keys(firstRow) : [];

    return {
      fields: fieldNames,
      rows,
      rowCount: rows.length,
    };
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

export const sqliteConnector: ConnectorFactory = {
  type: "sqlite",
  displayName: "SQLite",
  dialect: "sqlite",

  async createClient(ds: DataSource): Promise<ConnectorClient> {
    return new SqliteClient(ds);
  },

  validateParams(params: Record<string, unknown>) {
    const errors: string[] = [];
    if (!params.database) {
      errors.push("Database file path is required (or use ':memory:' for in-memory database)");
    }
    return errors.length ? { ok: false as const, errors } : { ok: true as const };
  },
};
