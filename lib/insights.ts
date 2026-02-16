import { openaiClient, pickModel } from "@/lib/openai";

export type InsightParams = {
  question: string;
  sql: string;
  fields: string[];
  rows: Record<string, unknown>[];
};

export type KeyMetric = {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
};

export type InsightResult = {
  summary: string;
  keyMetrics: KeyMetric[];
  observations: string[];
};

const MAX_ROWS = 50;
const MAX_COLS = 10;

function truncateData(fields: string[], rows: Record<string, unknown>[]): string {
  const cols = fields.slice(0, MAX_COLS);
  const truncatedRows = rows.slice(0, MAX_ROWS);

  // Serialize as compact CSV to save tokens
  const header = cols.join(",");
  const lines = truncatedRows.map((row) =>
    cols.map((col) => {
      const v = row[col];
      if (v === null || v === undefined) return "";
      return String(v);
    }).join(",")
  );
  return `${header}\n${lines.join("\n")}`;
}

const SYSTEM_PROMPT = `You are a data analyst. Given a user's question, the SQL query that answered it, and the result data, provide:
1. A concise plain-English summary (2-3 sentences) directly answering the question with specific numbers.
2. Up to 5 key metrics extracted from the data, each with a label, value, and optional trend (up/down/flat).
3. Up to 4 bullet-point observations (patterns, anomalies, or actionable insights).

Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "string",
  "keyMetrics": [{"label": "string", "value": "string", "trend": "up|down|flat"}],
  "observations": ["string"]
}`;

export async function generateInsights(params: InsightParams): Promise<InsightResult> {
  const data = truncateData(params.fields, params.rows);
  const totalRows = params.rows.length;

  const userMsg = `Question: ${params.question}
SQL: ${params.sql}
Data (${totalRows} total rows${totalRows > MAX_ROWS ? `, showing first ${MAX_ROWS}` : ""}):
${data}`;

  const resp = await openaiClient.chat.completions.create({
    model: pickModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
  });

  const raw = resp.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary || "No summary available.",
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : [],
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
    };
  } catch {
    return { summary: raw, keyMetrics: [], observations: [] };
  }
}

export async function* streamInsights(params: InsightParams): AsyncGenerator<string> {
  const data = truncateData(params.fields, params.rows);
  const totalRows = params.rows.length;

  const userMsg = `Question: ${params.question}
SQL: ${params.sql}
Data (${totalRows} total rows${totalRows > MAX_ROWS ? `, showing first ${MAX_ROWS}` : ""}):
${data}

Provide a concise, insightful analysis directly answering the question. Include specific numbers. Highlight key trends and actionable observations. Use plain English, not JSON.`;

  const stream = await openaiClient.chat.completions.create({
    model: pickModel(),
    temperature: 0.2,
    stream: true,
    messages: [
      { role: "system", content: "You are a data analyst. Provide clear, concise insights from query results. Lead with the direct answer, then add 2-3 key observations. Use specific numbers." },
      { role: "user", content: userMsg },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
}
