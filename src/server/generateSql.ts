import { getOpenAIClient, pickModel } from "@/lib/openai";

type Params = {
  question: string;
  schema: string; // compact schema string
  orgContext?: string;
};

export async function nlToSql({ question, schema, orgContext }: Params): Promise<string> {
  const client = getOpenAIClient();
  const model = pickModel();
  const system = "Convert English to a single, safe PostgreSQL SELECT using only the SCHEMA. No INSERT/UPDATE/DELETE/DDL. Prefer explicit columns. Output SQL only.";
  const user = `SCHEMA:\n${schema}\n\n${orgContext ? `CONTEXT:\n${orgContext}\n\n` : ""}QUESTION:\n${question}\n\nReturn only SQL.`;

  const resp = await client.chat.completions.create({
    model,
    temperature: 0.1,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const sql = (resp.choices?.[0]?.message?.content || "").trim();
  return sql;
}

