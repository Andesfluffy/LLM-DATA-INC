import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type ConversationTurn = {
  question: string;
  sql: string;
};

type Params = {
  question: string;
  schema: string; // compact schema string
  orgContext?: string;
  dialect?: string; // "postgresql" | "mysql" | "sqlite" — defaults to "PostgreSQL"
  conversationHistory?: ConversationTurn[];
};

export async function nlToSql({ question, schema, orgContext, dialect, conversationHistory }: Params): Promise<string> {
  if (!openai.apiKey) throw new Error("Missing OPENAI_API_KEY");
  const dbName = dialect === "mysql" ? "MySQL" : dialect === "sqlite" ? "SQLite" : "PostgreSQL";

  const hasHistory = conversationHistory && conversationHistory.length > 0;

  const system = hasHistory
    ? `Convert English to a single, safe ${dbName} SELECT using only the SCHEMA. No INSERT/UPDATE/DELETE/DDL. Prefer explicit columns. Output SQL only. If CONVERSATION HISTORY is provided, treat the new QUESTION as a follow-up — reuse or adapt the previous SQL pattern based on the user's intent.`
    : `Convert English to a single, safe ${dbName} SELECT using only the SCHEMA. No INSERT/UPDATE/DELETE/DDL. Prefer explicit columns. Output SQL only.`;

  let userContent = `SCHEMA:\n${schema}\n\n`;

  if (orgContext) {
    userContent += `CONTEXT:\n${orgContext}\n\n`;
  }

  if (hasHistory) {
    userContent += "CONVERSATION HISTORY:\n";
    for (const turn of conversationHistory) {
      userContent += `Q: ${turn.question}\nSQL: ${turn.sql}\n`;
    }
    userContent += "\n";
  }

  userContent += `QUESTION:\n${question}\n\nReturn only SQL.`;

  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  let sql = (resp.choices?.[0]?.message?.content || "").trim();
  // Strip markdown code fences that GPT sometimes wraps around SQL
  sql = sql.replace(/^```(?:sql)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  return sql;
}
