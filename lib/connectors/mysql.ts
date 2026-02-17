import type { DataSource } from "@prisma/client";
import type { ConnectorClient, ConnectorFactory } from "./types";
import { decryptDataSourcePassword } from "@/lib/datasourceSecrets";

// Schema cache (5-minute TTL)
const schemaCache = new Map<string, { ddl: string; expiresAt: number }>();
const SCHEMA_TTL = 5 * 60 * 1000;

class MysqlClient implements ConnectorClient {
  private connection: any = null;
  private ds: DataSource;

  constructor(ds: DataSource) {
    this.ds = ds;
  }

  private async getConnection() {
    if (this.connection) return this.connection;

    // Dynamic import — mysql2 may not be installed yet
    const mysql = await import("mysql2/promise");

    let password: string | null = null;
    try {
      password = decryptDataSourcePassword(this.ds);
    } catch {
      // no password
    }

    this.connection = await mysql.createConnection({
      host: this.ds.host || "localhost",
      port: this.ds.port || 3306,
      database: this.ds.database || undefined,
      user: this.ds.user || undefined,
      password: password || undefined,
      connectTimeout: 10000,
    });

    return this.connection;
  }

  async testConnection(): Promise<{ ok: boolean; ms: number; error?: string }> {
    const t0 = Date.now();
    try {
      const conn = await this.getConnection();
      await conn.query("SELECT 1");
      return { ok: true, ms: Date.now() - t0 };
    } catch (err: any) {
      return { ok: false, ms: Date.now() - t0, error: err.message || String(err) };
    }
  }

  async getSchema(opts?: { cacheKey?: string; allowedTables?: string[] }): Promise<string> {
    const key = opts?.cacheKey || `${this.ds.host}:${this.ds.port}:${this.ds.database}`;
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

    const conn = await this.getConnection();
    const [rows] = await conn.query(`
      SELECT TABLE_NAME AS \`table\`, COLUMN_NAME AS \`column\`, DATA_TYPE AS data_type
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);

    const lines = (rows as any[]).map(
      (r) => `${r.table}.${r.column} ${r.data_type}`
    );
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
    const conn = await this.getConnection();
    const [rows] = await conn.query(`
      SELECT TABLE_NAME AS \`table\`
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    `);
    const discovered = (rows as any[]).map((r) => r.table);
    if (!allowedTables) return discovered;
    const allowed = new Set(allowedTables.map((table) => table.toLowerCase()));
    return discovered.filter((table) => allowed.has(String(table).toLowerCase()));
  }

  async executeQuery(
    sql: string,
    opts?: { limit?: number; timeoutMs?: number }
  ) {
    const conn = await this.getConnection();
    const timeout = Math.floor((opts?.timeoutMs ?? 10000) / 1000);
    await conn.query(`SET SESSION max_execution_time = ${timeout * 1000}`);
    const [rows, fields] = await conn.query(sql);

    const fieldNames = (fields as any[])?.map((f: any) => f.name) ||
      Object.keys((rows as any[])?.[0] || {});

    return {
      fields: fieldNames,
      rows: rows as Record<string, unknown>[],
      rowCount: (rows as any[]).length,
    };
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.end();
      } catch {
        // ignore
      }
      this.connection = null;
    }
  }
}

export const mysqlConnector: ConnectorFactory = {
  type: "mysql",
  displayName: "MySQL",
  dialect: "mysql",

  async createClient(ds: DataSource): Promise<ConnectorClient> {
    return new MysqlClient(ds);
  },

  validateParams(params: Record<string, unknown>) {
    const errors: string[] = [];
    if (!params.host) errors.push("Host is required");
    if (!params.database) errors.push("Database is required");
    if (!params.user) errors.push("User is required");
    const port = Number(params.port);
    if (!port || port < 1 || port > 65535) errors.push("Port must be 1-65535");
    return errors.length ? { ok: false as const, errors } : { ok: true as const };
  },
};
