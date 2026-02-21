import { genAI } from "@/lib/gemini";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  const dbName = dialect === "mysql" ? "MySQL" : dialect === "sqlite" ? "SQLite" : "PostgreSQL";

  const hasHistory = conversationHistory && conversationHistory.length > 0;

  const offTopicInstruction = `If the question cannot be answered from the schema (references tables, fields, or topics that do not exist in the schema), respond with exactly: OFFTOPIC: <one-sentence reason>. Otherwise, output SQL only.`;

  const systemInstruction = hasHistory
    ? `Convert English to a single, safe ${dbName} SELECT using only the SCHEMA. No INSERT/UPDATE/DELETE/DDL. Prefer explicit columns. ${offTopicInstruction} If CONVERSATION HISTORY is provided, treat the new QUESTION as a follow-up — reuse or adapt the previous SQL pattern based on the user's intent.`
    : `Convert English to a single, safe ${dbName} SELECT using only the SCHEMA. No INSERT/UPDATE/DELETE/DDL. Prefer explicit columns. ${offTopicInstruction}`;

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

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    generationConfig: { temperature: 0.1 },
  });

  const result = await model.generateContent(userContent);
  let sql = result.response.text().trim();
  // Strip markdown code fences that Gemini sometimes wraps around SQL
  sql = sql.replace(/^```(?:sql)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  return sql;
}
