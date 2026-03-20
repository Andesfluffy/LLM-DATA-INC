import { aiGenerate } from "@/lib/ai";

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
  const dbName = dialect === "mysql" ? "MySQL" : dialect === "sqlite" ? "SQLite" : "PostgreSQL";

  const hasHistory = conversationHistory && conversationHistory.length > 0;

  const offTopicInstruction = `If the question cannot be answered from the schema (references tables, fields, or topics that do not exist in the schema), respond with exactly: OFFTOPIC: <one-sentence reason>. Otherwise, output SQL only.`;

  const baseInstruction = `Convert English to a single, safe ${dbName} SELECT using only the SCHEMA provided. Rules: (1) Output raw SQL only — no markdown, no code fences, no trailing semicolon, no EXPLAIN prefix. (2) Never use INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE or any DDL. (3) Prefer explicit column names over SELECT *. (4) ${offTopicInstruction}`;

  const system = hasHistory
    ? `${baseInstruction} If CONVERSATION HISTORY is provided, treat the new QUESTION as a follow-up — reuse or adapt the previous SQL pattern based on the user's intent.`
    : baseInstruction;

  let prompt = `SCHEMA:\n${schema}\n\n`;

  if (orgContext) {
    prompt += `CONTEXT:\n${orgContext}\n\n`;
  }

  if (hasHistory) {
    prompt += "CONVERSATION HISTORY:\n";
    for (const turn of conversationHistory) {
      prompt += `Q: ${turn.question}\nSQL: ${turn.sql}\n`;
    }
    prompt += "\n";
  }

  prompt += `QUESTION:\n${question}\n\nReturn only SQL.`;

  const result = await aiGenerate({ system, prompt, temperature: 0.1 });
  let sql = result.text.trim();
  // Strip markdown code fences that LLMs sometimes wrap around SQL
  sql = sql.replace(/^```(?:sql)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  // Strip trailing semicolons (they break the safety check)
  sql = sql.replace(/;+\s*$/, "");
  // Strip EXPLAIN / EXPLAIN ANALYZE prefix occasionally emitted
  sql = sql.replace(/^explain\s+(?:analyze\s+)?/i, "").trim();
  return sql;
}
