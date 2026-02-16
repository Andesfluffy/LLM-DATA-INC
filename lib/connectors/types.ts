import type { DataSource } from "@prisma/client";

export interface ConnectorClient {
  /** Test the connection, return latency in ms */
  testConnection(): Promise<{ ok: boolean; ms: number; error?: string }>;

  /** Get schema in compact DDL format for NL→SQL prompt */
  getSchema(cacheKey?: string): Promise<string>;

  /** Get the list of allowed table names (for guardrails) */
  getAllowedTables(): Promise<string[]>;

  /** Execute a read-only query, return fields + rows */
  executeQuery(
    sql: string,
    opts?: { limit?: number; timeoutMs?: number }
  ): Promise<{
    fields: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  }>;

  /** Clean up / close connection */
  disconnect(): Promise<void>;
}

export interface ConnectorFactory {
  /** The type identifier, matches DataSource.type */
  type: string;

  /** Human-readable name */
  displayName: string;

  /** SQL dialect for prompt and guardrail awareness */
  dialect: "postgresql" | "mysql" | "sqlite";

  /** Create a client from a DataSource record */
  createClient(ds: DataSource): Promise<ConnectorClient>;

  /** Validate connection params before saving */
  validateParams(
    params: Record<string, unknown>
  ): { ok: true } | { ok: false; errors: string[] };
}
