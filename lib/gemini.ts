import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export function pickModel() {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}
