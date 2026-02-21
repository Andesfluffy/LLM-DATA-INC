import { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser, findAccessibleDataSource } from "@/lib/userOrg";
import { getConnector } from "@/lib/connectors/registry";
import { getGuardrails } from "@/lib/connectors/guards";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { generateContextQueries, streamDeepAnalysis, type ContextData } from "@/lib/deepAnalysis";
import "@/lib/connectors/init";

const Body = z.object({
  datasourceId: z.string().min(1),
  question: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const { datasourceId, question } = parsed.data;
  const { user: dbUser } = await ensureUser(userAuth);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId });
  if (!ds) {
    return new Response(JSON.stringify({ error: "Data source not found." }), { status: 404 });
  }

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  const guards = getGuardrails(factory.dialect);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      };

      try {
        const scopedTables = await getPersistedDatasourceScope(ds.id);

        if (!scopedTables.length) {
          send(
            "No monitored tables are selected for this data source. Please update the scope in Settings to enable analysis.",
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        const schemaKey = `${ds.id}:${ds.type}`;
        const schema = await client.getSchema({ cacheKey: schemaKey, allowedTables: scopedTables });

        // Ask Gemini what queries would be most useful to answer this analytical question
        const rawQueries = await generateContextQueries(question, schema, factory.dialect);

        const allowedTables = await client.getAllowedTables(scopedTables);
        const contextData: ContextData[] = [];

        for (const rawSql of rawQueries.slice(0, 5)) {
          // Apply same safety guardrails as regular query execution
          if (!guards.isSelectOnly(rawSql)) continue;

          const guardResult = guards.validateSql(rawSql, allowedTables);
          if (!guardResult.ok) continue;

          const safeSql = guards.enforceLimit(rawSql, 100);

          try {
            const result = await client.executeQuery(safeSql, { timeoutMs: 10_000 });
            contextData.push({
              sql: safeSql,
              fields: result.fields,
              rows: result.rows,
              rowCount: result.rowCount,
            });
          } catch (err: any) {
            contextData.push({
              sql: safeSql,
              fields: [],
              rows: [],
              rowCount: 0,
              error: String(err?.message ?? err),
            });
          }
        }

        // Stream the comprehensive analysis
        for await (const chunk of streamDeepAnalysis({ question, schema, contextData })) {
          send(chunk);
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg || "Analysis failed" })}\n\n`),
        );
      } finally {
        controller.close();
        await client.disconnect();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
