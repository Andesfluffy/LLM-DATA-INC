import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { getConnector } from "@/lib/connectors/registry";
import "@/lib/connectors/init";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const Body = z.object({
    type: z.string().default("postgres"),
    host: z.string().optional(),
    port: z.coerce.number().int().positive().optional(),
    database: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
  });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, ...params } = parsed.data;

  if (type === "csv") {
    return NextResponse.json(
      { error: "Spreadsheet uploads are tested during upload. Use 'Upload & Connect' for CSV/Excel files." },
      { status: 400 }
    );
  }

  let factory;
  try {
    factory = getConnector(type);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unsupported connector type" }, { status: 400 });
  }

  const paramsForValidation =
    type === "sqlite"
      ? { database: params.database }
      : { host: params.host, port: params.port, database: params.database, user: params.user };
  const validation = factory.validateParams(paramsForValidation);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors.join(". ") }, { status: 400 });
  }

  // Use direct clients for database connectors so tests work without requiring
  // encrypted credentials to be persisted first.
  if (type === "postgres") {
    const { Client } = await import("pg");
    const client = new Client({
      host: params.host,
      port: params.port,
      database: params.database,
      user: params.user,
      password: params.password,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
    const t0 = Date.now();
    try {
      await client.connect();
      await client.query("SET statement_timeout = 10000");
      await client.query("SELECT 1");
      return NextResponse.json({ ms: Date.now() - t0 });
    } catch (e: any) {
      return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    } finally {
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }

  if (type === "mysql") {
    try {
      const mysql = await import("mysql2/promise");
      const t0 = Date.now();
      const conn = await mysql.createConnection({
        host: params.host || "localhost",
        port: params.port || 3306,
        database: params.database,
        user: params.user,
        password: params.password,
        connectTimeout: 10000,
      });
      await conn.query("SELECT 1");
      await conn.end();
      return NextResponse.json({ ms: Date.now() - t0 });
    } catch (e: any) {
      return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
  }

  if (type === "sqlite") {
    const client = await factory.createClient({
      id: "test",
      name: "SQLite test",
      type: "sqlite",
      host: null,
      port: null,
      database: params.database || null,
      user: null,
      passwordCiphertext: null,
      passwordIv: null,
      passwordTag: null,
      urlCiphertext: null,
      urlIv: null,
      urlTag: null,
      orgId: null,
      ownerId: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    try {
      const result = await client.testConnection();
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "SQLite connection failed" }, { status: 400 });
      }
      return NextResponse.json({ ms: result.ms });
    } finally {
      await client.disconnect();
    }
  }

  return NextResponse.json({ error: `Test not supported for type: ${type}` }, { status: 400 });
}
