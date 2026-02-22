import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser, findAccessibleDataSource } from "@/lib/userOrg";
import { getPersistedDatasourceScope } from "@/lib/datasourceScope";
import { getConnector } from "@/lib/connectors/registry";
import "@/lib/connectors/init";
import { z } from "zod";
import crypto from "crypto";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type SuggestResult = {
  description: string;
  suggestions: string[];
};

// Cache for 10 minutes per datasource+schema hash
const suggestCache = new Map<string, { data: SuggestResult; expiresAt: number }>();

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const Body = z.object({ datasourceId: z.string().min(1) });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { datasourceId } = parsed.data;
  const { user: dbUser } = await ensureUser(user);

  const ds = await findAccessibleDataSource({ userId: dbUser.id, datasourceId });
  if (!ds) return NextResponse.json({ error: "DataSource not found" }, { status: 404 });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);

  try {
    const scopedTables = await getPersistedDatasourceScope(ds.id);
    const schemaKey = `${ds.id}:${ds.type}`;
    const schema = scopedTables.length
      ? await client.getSchema({ cacheKey: schemaKey, allowedTables: scopedTables })
      : await client.getSchema({ cacheKey: schemaKey });

    const schemaHash = crypto.createHash("sha256").update(schema).digest("hex");
    const cacheKey = `${ds.id}|${schemaHash}`;

    const cached = suggestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const suggestModel = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: `You are a data assistant helping business users understand what they can query. Given a database schema, write a plain-language summary of what data is available and generate exactly 5 SQL-answerable business questions.

STRICT RULES for questions:
- Every question MUST be directly answerable by a single SELECT query against the schema (counts, sums, averages, rankings, breakdowns, comparisons, filters by date/category)
- Every question MUST reference entities, metrics, or time concepts that are CLEARLY PRESENT in the schema — do not invent columns or concepts not in the schema
- DO NOT generate questions about predictions, forecasts, future projections, "what will happen", "what should we do", recommendations, strategy, root causes, or "why" questions
- Good question types: "Which [entity] had the highest [metric]?", "How many [items] in [period]?", "Show [metric] broken down by [category]", "What is the total [metric] for [filter]?", "Top N [entities] by [metric]"

Respond ONLY with valid JSON in this exact shape: {"description": "...", "suggestions": ["q1", "q2", "q3", "q4", "q5"]}`,
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const suggestResult = await suggestModel.generateContent(
      `SCHEMA:\n${schema}\n\nWrite a 2-3 sentence plain-language description of this data (mention key topics, not technical column names). Then provide exactly 5 questions that are directly answerable by SELECT queries against this specific schema — counts, rankings, breakdowns, and comparisons only. Each question must map to real tables and columns visible above. No predictions, no recommendations, no "why" questions.`
    );
    const content = suggestResult.response.text() ?? "{}";
    let result: SuggestResult;
    try {
      const parsed = JSON.parse(content) as Partial<SuggestResult>;
      result = {
        description: parsed.description ?? "Your data source is connected.",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
      };
    } catch {
      result = { description: "Your data source is connected.", suggestions: [] };
    }

    suggestCache.set(cacheKey, { data: result, expiresAt: Date.now() + 10 * 60_000 });
    return NextResponse.json(result);
  } finally {
    await client.disconnect();
  }
}
