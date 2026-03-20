import { aiGenerate, aiStreamGemini } from "@/lib/ai";

// Patterns that signal a question needs deep analysis (predictions, recommendations, causal reasoning,
// pattern interpretation) rather than a simple SQL data retrieval.
const ANALYTICAL_PATTERNS = [
  // Predictions & forecasts
  /\bpredict\b/i,
  /\bforecast\b/i,
  /\bprojection\b/i,
  /\bproject\b(?! (the|a|an|this|that|those|these|my|our|your) (table|column|row|field|data|result))/i,
  /what (will|would|might|could) happen/i,
  /what (will|would) .*(look like|be like|become)/i,
  /in the next \d+ (year|month|week|quarter)/i,
  /next (year|month|quarter|decade)/i,
  /\blikelihood\b/i,
  /\bprobability\b/i,
  /\boutlook\b/i,
  /\bexpect(ed|ation)?\b.*(next|future|coming)/i,

  // Risk & opportunity
  /\brisk of\b/i,
  /\bat.?risk\b/i,
  /\bopportunit(y|ies)\b/i,
  /\bvulnerab(le|ility)\b/i,

  // Recommendations & strategy
  /\brecommend\b/i,
  /\bsuggestion\b/i,
  /\bstrategy\b/i,
  /\bstrategies\b/i,
  /what (can|should|could|would|might) (be done|we|they|the (government|authorities|police|state|country))/i,
  /how (can|do|to|should|could) .*(reduce|improve|prevent|address|tackle|solve|minimize|decrease|lower|curb|combat|stop)/i,
  /\bprescri(be|ption|ptive)\b/i,
  /what steps? (can|should|could|would)/i,
  /what (measures|actions|policies|initiatives)/i,

  // Causal & explanatory
  /what factors? (influence|affect|drive|cause|impact|contribute)/i,
  /why (do|does|is|are|did|were|has|have) .*(high|low|increase|decrease|rise|fall|grow|decline|spike|surge|drop)/i,
  /root cause/i,
  /\binterventions?\b/i,
  /what (is|are) (the|a) (cause|driver|reason) (of|for|behind)/i,
  /how (likely|probable)/i,
  /what (explains?|accounts? for|drives?)\b/i,
  /\bdriven by\b/i,

  // Correlations & patterns
  /\bcorrelat(e|ion|ions|ed) (between|with|among)/i,
  /\bpattern(s)?\b.*(in|across|among|between)/i,
  /\brelationship\b.*(between|with|among)/i,
  /\bassociat(e|ion)\b.*(between|with)/i,

  // Analysis & insights (interpretive questions)
  /\banalyze\b|\banalysis\b/i,
  /\binsight(s)?\b/i,
  /\bimpact of\b/i,
  /\beffect of\b/i,
  /how (well|poorly|effectively|efficiently) .*(perform|work|run|operat)/i,
  /\bperformance\b.*(assess|evaluat|review|analyz)/i,
  /\bsignificant(ly)?\b.*(change|shift|differ|drop|spike)/i,
  /what does .*(mean|tell|indicate|suggest|show)/i,
  /\bunderstand\b.*(why|how|what)/i,
];

export function isAnalyticalQuestion(question: string): boolean {
  return ANALYTICAL_PATTERNS.some((pattern) => pattern.test(question));
}

export type ContextData = {
  sql: string;
  fields: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
};

/**
 * Ask Gemini to generate 2–5 SQL queries that would gather the most relevant
 * data to answer this analytical question.
 */
export async function generateContextQueries(
  question: string,
  schema: string,
  dialect: string,
): Promise<string[]> {
  const dbName =
    dialect === "mysql" ? "MySQL" : dialect === "sqlite" ? "SQLite" : "PostgreSQL";

  const result = await aiGenerate({
    system: `You are a data analyst planning an analysis. Given an analytical question and a database schema, generate 2–5 ${dbName} SELECT queries that together provide the data needed to answer the question comprehensively. Focus on: historical trends over time, distributions across categories, top/bottom performers, year-over-year comparisons, aggregates by region or category, and any correlations relevant to the question. Rules: (1) Output ONLY a valid JSON array of SQL strings — no markdown, no code fences, no explanation. (2) Every query must be SELECT-only — no INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE. (3) Add LIMIT 100 to each non-aggregating query. (4) Prefer explicit column names over SELECT *. (5) If the schema does not support the question at all, return an empty array [].`,
    prompt: `SCHEMA:\n${schema}\n\nANALYTICAL QUESTION: ${question}\n\nGenerate SQL queries to gather the data needed. Return a JSON array of SQL strings only.`,
    temperature: 0.1,
    json: true,
  });
  const raw = result.text.trim();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) =>
          q
            .replace(/^```(?:sql)?\s*\n?/i, "")
            .replace(/\n?```\s*$/, "")
            .replace(/;+\s*$/, "")
            .trim(),
        );
    }
  } catch {
    // fall through to empty
  }

  return [];
}

function formatContextData(contextData: ContextData[]): string {
  const successful = contextData.filter((d) => !d.error && d.rows.length > 0);
  if (successful.length === 0) return "(no data could be retrieved)";

  return successful
    .map((d, i) => {
      const header = d.fields.join(",");
      const rows = d.rows
        .slice(0, 50)
        .map((row) =>
          d.fields
            .map((f) => {
              const v = row[f];
              if (v === null || v === undefined) return "";
              const s = String(v);
              return s.includes(",") ? `"${s}"` : s;
            })
            .join(","),
        )
        .join("\n");
      const label = `DATA SET ${i + 1} (${d.rowCount} total rows${d.rowCount > 50 ? ", showing first 50" : ""})`;
      return `${label}:\nSQL: ${d.sql}\n${header}\n${rows}`;
    })
    .join("\n\n");
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert data scientist and analyst. Your role is to analyze database data and provide evidence-based insights, predictions, and recommendations.

Guidelines:
- Ground EVERY finding in the actual data provided — cite specific numbers, dates, and names from the data
- Clearly distinguish between facts (what the data shows) and inferences (what you conclude from it)
- For predictions/forecasts: state the observed trend, extrapolate it, and specify your assumptions and confidence level
- For recommendations: each recommendation must be tied to a specific data pattern you observed
- Be direct, clear, and actionable
- Use markdown formatting with headers (##) and bullet points (-)
- Never fabricate data or statistics not present in the datasets provided
- End with a "Data Limitations" section noting what additional data would strengthen the analysis

Structure your response using only the relevant sections from:
## Current State
## Key Findings
## Patterns & Correlations
## Prediction / Forecast
## Recommendations
## Data Limitations`;

export async function* streamDeepAnalysis(params: {
  question: string;
  schema: string;
  contextData: ContextData[];
}): AsyncGenerator<string> {
  const { question, schema, contextData } = params;

  const formattedData = formatContextData(contextData);
  const successCount = contextData.filter((d) => !d.error && d.rows.length > 0).length;

  if (successCount === 0) {
    yield "I was unable to retrieve sufficient data from your database to answer this question.\n\nThis may mean:\n- The relevant tables don't contain the needed information\n- The data isn't structured in a way that supports this type of analysis\n- The monitored table scope may need to be expanded in Settings\n\nTry connecting more tables or rephrasing the question.";
    return;
  }

  const prompt = `QUESTION: ${question}

DATABASE SCHEMA:
${schema}

GATHERED DATA (${successCount} query result${successCount === 1 ? "" : "s"}):
${formattedData}

Please provide a comprehensive analysis answering the question based strictly on the data above.`;

  // Deep analysis uses Gemini specifically for higher quality reasoning & streaming
  yield* aiStreamGemini({
    system: ANALYSIS_SYSTEM_PROMPT,
    prompt,
    temperature: 0.3,
  });
}
