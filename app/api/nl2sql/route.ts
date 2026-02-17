import { NextRequest, NextResponse } from "next/server";
import { prisma as appPrisma } from "@/lib/db";
import { nlToSql } from "@/src/server/generateSql";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { getGlossaryContext } from "@/lib/glossary";
import { getConnector } from "@/lib/connectors/registry";
import { getGuardrails } from "@/lib/connectors/guards";
import "@/lib/connectors/init";
import { z } from "zod";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const Body = z.object({ orgId: z.string().min(1), datasourceId: z.string().min(1), prompt: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orgId, datasourceId, prompt } = parsed.data;
  const { user: dbUser, org } = await ensureUserAndOrg(user);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId, orgId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  const guards = getGuardrails(factory.dialect);
  const cacheOrgId = ds.orgId ?? org.id;

  try {
    const scopedTables = await getPersistedDatasourceScope(ds.id);
    if (!scopedTables.length) {
      return NextResponse.json({ error: "No monitored tables selected for this data source. Update scope in Settings." }, { status: 400 });
    }
    const schemaKey = `${ds.id}:${ds.type}`;
    const schema = await client.getSchema({ cacheKey: schemaKey, allowedTables: scopedTables });
    const schemaHash = crypto.createHash("sha256").update(schema).digest("hex");

    const glossaryCtx = await getGlossaryContext(cacheOrgId);
    const glossaryHash = glossaryCtx
      ? crypto.createHash("sha256").update(glossaryCtx).digest("hex").slice(0, 8)
      : "";

    const key = `${cacheOrgId}|${schemaHash}|${glossaryHash}|${crypto.createHash("sha256").update(prompt).digest("hex")}`;
    const cached = nlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ sql: cached.sql });
    }

    const generated = await nlToSql({
      question: prompt,
      schema,
      orgContext: glossaryCtx || undefined,
      dialect: factory.dialect,
    });

    if (!guards.isSelectOnly(generated)) {
      await appPrisma.auditLog.create({
        data: { orgId: cacheOrgId, userId: dbUser.id, question: prompt, sql: generated, durationMs: Date.now() - t0, rowCount: null },
      });
      return NextResponse.json({ error: "Only read-only SELECT queries are allowed" }, { status: 400 });
    }

    const allowedTables = await client.getAllowedTables(scopedTables);
    const guard = guards.validateSql(generated, allowedTables);
    if (!guard.ok) {
      await appPrisma.auditLog.create({
        data: { orgId: cacheOrgId, userId: dbUser.id, question: prompt, sql: generated, durationMs: Date.now() - t0, rowCount: null },
      });
      return NextResponse.json({ error: `Guardrails rejected SQL: ${guard.reason}` }, { status: 400 });
    }

    const limited = guards.enforceLimit(generated, 1000);
    await appPrisma.auditLog.create({
      data: { orgId: cacheOrgId, userId: dbUser.id, question: prompt, sql: limited, durationMs: Date.now() - t0, rowCount: null },
    });
    nlCache.set(key, { sql: limited, expiresAt: Date.now() + 30_000 });

    return NextResponse.json({ sql: limited });
  } catch {
    await appPrisma.auditLog.create({
      data: { orgId: cacheOrgId, userId: dbUser.id, question: prompt, sql: null, durationMs: Date.now() - t0, rowCount: null },
    });
    return NextResponse.json({ error: "Failed to generate SQL" }, { status: 500 });
  } finally {
    await client.disconnect();
  }
}

const nlCache = new Map<string, { sql: string; expiresAt: number }>();
