import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { getUserFromRequest } from "@/lib/auth-server";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const Body = z.object({ host: z.string().min(1), port: z.coerce.number().int().positive(), database: z.string().min(1), user: z.string().min(1), password: z.string().optional() });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { host, port, database, user, password } = parsed.data;
  const client = new Client({ host, port: Number(port), database, user, password, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
  const t0 = Date.now();
  try {
    await client.connect();
    await client.query("SET statement_timeout = 10000");
    await client.query("select 1");
    const ms = Date.now() - t0;
    return NextResponse.json({ ms });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  } finally {
    try { await client.end(); } catch {}
  }
}
