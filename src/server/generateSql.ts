import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type Params = {
  question: string;
  schema: string; // compact schema string
  orgContext?: string;
};

export async function nlToSql({ question, schema, orgContext }: Params): Promise<string> {
  if (!openai.apiKey) throw new Error("Missing OPENAI_API_KEY");
  const system = "Convert English to a single, safe PostgreSQL SELECT using only the SCHEMA. No INSERT/UPDATE/DELETE/DDL. Prefer explicit columns. Output SQL only.";
  const user = `SCHEMA:\n${schema}\n\n${orgContext ? `CONTEXT:\n${orgContext}\n\n` : ""}QUESTION:\n${question}\n\nReturn only SQL.`;

  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const sql = (resp.choices?.[0]?.message?.content || "").trim();
  return sql;
}

