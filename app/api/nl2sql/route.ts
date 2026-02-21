import { NextRequest, NextResponse } from "next/server";
import { prisma as appPrisma } from "@/lib/db";
import { nlToSql } from "@/src/server/generateSql";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser, findAccessibleDataSource } from "@/lib/userOrg";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { getConnector } from "@/lib/connectors/registry";
import { getGuardrails } from "@/lib/connectors/guards";
import "@/lib/connectors/init";
import { z } from "zod";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const Body = z.object({ datasourceId: z.string().min(1), prompt: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { datasourceId, prompt } = parsed.data;
  const { user: dbUser } = await ensureUser(user);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  const guards = getGuardrails(factory.dialect);

  try {
    const scopedTables = await getPersistedDatasourceScope(ds.id);
    if (!scopedTables.length) {
      return NextResponse.json({ error: "No monitored tables selected for this data source. Update scope in Settings." }, { status: 400 });
    }
    const schemaKey = `${ds.id}:${ds.type}`;
    const schema = await client.getSchema({ cacheKey: schemaKey, allowedTables: scopedTables });
    const schemaHash = crypto.createHash("sha256").update(schema).digest("hex");

    const key = `${ds.id}|${schemaHash}|${crypto.createHash("sha256").update(prompt).digest("hex")}`;
    const cached = nlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ sql: cached.sql });
    }

    const generated = await nlToSql({
      question: prompt,
      schema,
      dialect: factory.dialect,
    });

    // Off-topic detection: LLM signals the question doesn't match the schema
    if (generated.startsWith("OFFTOPIC:")) {
      const reason = generated.slice("OFFTOPIC:".length).trim();
      await appPrisma.queryAudit.create({
        data: { userId: dbUser.id, dataSourceId: ds.id, nlQuery: prompt, status: "off_topic", durationMs: Date.now() - t0 },
      });
      return NextResponse.json({ offTopic: true, reason });
    }

    if (!guards.isSelectOnly(generated)) {
      await appPrisma.queryAudit.create({
        data: { userId: dbUser.id, nlQuery: prompt, generatedSql: generated, status: "rejected_not_select", durationMs: Date.now() - t0 },
      });
      return NextResponse.json({ error: "Only read-only SELECT queries are allowed" }, { status: 400 });
    }

    const allowedTables = await client.getAllowedTables(scopedTables);
    const guard = guards.validateSql(generated, allowedTables);
    if (!guard.ok) {
      await appPrisma.queryAudit.create({
        data: { userId: dbUser.id, nlQuery: prompt, generatedSql: generated, status: "rejected_guardrail", durationMs: Date.now() - t0 },
      });
      return NextResponse.json({ error: `Guardrails rejected SQL: ${guard.reason}` }, { status: 400 });
    }

    const limited = guards.enforceLimit(generated, 1000);
    await appPrisma.queryAudit.create({
      data: { userId: dbUser.id, dataSourceId: ds.id, nlQuery: prompt, generatedSql: limited, status: "success", durationMs: Date.now() - t0 },
    });
    nlCache.set(key, { sql: limited, expiresAt: Date.now() + 30_000 });

    return NextResponse.json({ sql: limited });
  } catch {
    await appPrisma.queryAudit.create({
      data: { userId: dbUser.id, nlQuery: prompt, status: "error", durationMs: Date.now() - t0 },
    });
    return NextResponse.json({ error: "Failed to generate SQL" }, { status: 500 });
  } finally {
    await client.disconnect();
  }
}

const nlCache = new Map<string, { sql: string; expiresAt: number }>();
