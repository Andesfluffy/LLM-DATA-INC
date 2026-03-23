import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "[gemini] GEMINI_API_KEY is not set. Cannot initialize Gemini provider."
    );
  }
  _genAI = new GoogleGenerativeAI(key);
  return _genAI;
}

/** @deprecated Use getGenAI() instead — this throws if key is missing */
export const genAI = new Proxy({} as GoogleGenerativeAI, {
  get(_target, prop) {
    return (getGenAI() as any)[prop];
  },
});

export function pickModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}
