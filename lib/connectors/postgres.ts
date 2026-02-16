import { Client } from "pg";
import type { DataSource } from "@prisma/client";
import type { ConnectorClient, ConnectorFactory } from "./types";
import { decryptDataSourcePassword, getDataSourceConnectionUrl } from "@/lib/datasourceSecrets";

// Schema cache (5-minute TTL)
const schemaCache = new Map<string, { ddl: string; expiresAt: number }>();
const SCHEMA_TTL = 5 * 60 * 1000;

function buildClientConfig(ds: DataSource) {
  let password: string | null = null;
  let connectionString: string | undefined;

  try {
    password = decryptDataSourcePassword(ds);
    if (ds.urlCiphertext || !ds.host || !ds.database || !ds.user) {
      connectionString = getDataSourceConnectionUrl(ds);
    }
  } catch {
    // Fall through — will fail at connect time
  }

  return {
    host: ds.host || undefined,
    port: ds.port || undefined,
    database: ds.database || undefined,
    user: ds.user || undefined,
    password: password || undefined,
    connectionString,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

class PostgresClient implements ConnectorClient {
  private client: Client;
  private cacheKey: string;
  private connected = false;

  constructor(private ds: DataSource) {
    this.client = new Client(buildClientConfig(ds));
    this.cacheKey = `${ds.host}:${ds.port}:${ds.database}:${ds.user}`;
  }

  private async ensureConnected() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async testConnection(): Promise<{ ok: boolean; ms: number; error?: string }> {
    const t0 = Date.now();
    try {
      await this.ensureConnected();
      await this.client.query("SET statement_timeout = 10000");
      await this.client.query("SELECT 1");
      return { ok: true, ms: Date.now() - t0 };
    } catch (err: any) {
      return { ok: false, ms: Date.now() - t0, error: err.message || String(err) };
    }
  }

  async getSchema(cacheKey?: string): Promise<string> {
    const key = cacheKey || this.cacheKey;
    const cached = schemaCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.ddl;

    await this.ensureConnected();
    const result = await this.client.query(`
      SELECT c.table_schema AS schema, c.table_name AS table, c.column_name AS column, c.data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON c.table_schema = t.table_schema AND c.table_name = t.table_name
      WHERE t.table_type = 'BASE TABLE'
        AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
    `);

    const lines: string[] = [];
    for (const row of result.rows) {
      const prefix = row.schema === "public" ? "" : `${row.schema}.`;
      lines.push(`${prefix}${row.table}.${row.column} ${row.data_type}`);
    }

    const ddl = lines.join("\n");
    schemaCache.set(key, { ddl, expiresAt: Date.now() + SCHEMA_TTL });
    return ddl;
  }

  async getAllowedTables(): Promise<string[]> {
    await this.ensureConnected();
    const result = await this.client.query(`
      SELECT table_schema AS schema, table_name AS table
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_type = 'BASE TABLE'
    `);
    return result.rows.map((r: any) =>
      r.schema === "public" ? r.table : `${r.schema}.${r.table}`
    );
  }

  async executeQuery(
    sql: string,
    opts?: { limit?: number; timeoutMs?: number }
  ) {
    await this.ensureConnected();
    const timeout = opts?.timeoutMs ?? 10000;
    await this.client.query("BEGIN");
    await this.client.query(`SET LOCAL statement_timeout = ${timeout}`);
    const result = await this.client.query(sql);
    await this.client.query("COMMIT");

    const fields =
      result.fields?.map((f: any) => f.name) ||
      Object.keys(result.rows?.[0] || {});

    return {
      fields,
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows?.length ?? 0,
    };
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await this.client.end();
      } catch {
        // ignore disconnect errors
      }
      this.connected = false;
    }
  }
}

export const postgresConnector: ConnectorFactory = {
  type: "postgres",
  displayName: "PostgreSQL",
  dialect: "postgresql",

  async createClient(ds: DataSource): Promise<ConnectorClient> {
    return new PostgresClient(ds);
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
