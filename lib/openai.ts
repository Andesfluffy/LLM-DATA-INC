import OpenAI from "openai";

export const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function pickModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

