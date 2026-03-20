/**
 * Unified AI provider abstraction.
 *
 * Routes requests to the best available provider:
 *   - Groq (llama-3.3-70b-versatile)  — primary for NL→SQL, suggestions, insights
 *   - Gemini (gemini-2.5-flash)        — fallback, and primary for deep analysis (streaming)
 *
 * Groq is accessed via the OpenAI-compatible API, making it trivial to swap
 * to any OpenAI-compatible provider (Together, Cerebras, OpenRouter) by
 * changing the baseURL.
 *
 * All high-volume calls go through Groq (14,400 free req/day) to preserve
 * Gemini quota (500 req/day) for quality-sensitive deep analysis.
 */

import OpenAI from "openai";

// ── Groq client (via OpenAI-compatible API) ─────────────────────────────────

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let _groq: OpenAI | null = null;

function getGroq(): OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
}

export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}

// ── Shared types ────────────────────────────────────────────────────────────

export type AiGenerateParams = {
  system: string;
  prompt: string;
  temperature?: number;
  json?: boolean;
};

export type AiGenerateResult = {
  text: string;
  provider: "groq" | "gemini";
};

// ── Retry with exponential backoff ──────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500; // 500ms → 1s → 2s

function isRetryable(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status || err?.statusCode || 0;
  if (status === 429 || (status >= 500 && status < 600)) return true;
  if (/rate.?limit|too many requests|quota|429|5\d\d|econnreset|etimedout|socket hang up|fetch failed/i.test(msg)) return true;
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
        console.warn(`[ai] ${label} attempt ${attempt + 1} failed (${err.message}), retrying in ${Math.round(delay)}ms…`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

// ── Generate (single response) ──────────────────────────────────────────────

/**
 * Generate a completion using Groq (primary) with Gemini fallback.
 * Each provider is retried up to 3 times with exponential backoff on transient errors.
 */
export async function aiGenerate(params: AiGenerateParams): Promise<AiGenerateResult> {
  const groq = getGroq();
  if (groq) {
    try {
      return await withRetry(() => groqGenerate(groq, params), "Groq generate");
    } catch (err: any) {
      console.warn("[ai] Groq failed after retries, falling back to Gemini:", err.message);
    }
  }
  return withRetry(() => geminiGenerate(params), "Gemini generate");
}

/**
 * Generate using Gemini specifically (for deep analysis or when Groq is unavailable).
 */
export async function aiGenerateGemini(params: AiGenerateParams): Promise<AiGenerateResult> {
  return withRetry(() => geminiGenerate(params), "Gemini generate");
}

// ── Streaming ───────────────────────────────────────────────────────────────

/**
 * Stream a completion. Uses Groq if available, otherwise Gemini.
 * The initial connection is retried with backoff; once streaming starts, errors are not retried.
 */
export async function* aiStream(params: AiGenerateParams): AsyncGenerator<string> {
  const groq = getGroq();
  if (groq) {
    try {
      yield* await withRetry(async () => groqStream(groq, params), "Groq stream");
      return;
    } catch (err: any) {
      console.warn("[ai] Groq stream failed after retries, falling back to Gemini:", err.message);
    }
  }
  yield* await withRetry(async () => geminiStream(params), "Gemini stream");
}

/**
 * Stream specifically from Gemini (for deep analysis).
 */
export async function* aiStreamGemini(params: AiGenerateParams): AsyncGenerator<string> {
  yield* await withRetry(async () => geminiStream(params), "Gemini stream");
}

// ── Groq implementation (OpenAI-compatible) ─────────────────────────────────

async function groqGenerate(client: OpenAI, params: AiGenerateParams): Promise<AiGenerateResult> {
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.prompt },
    ],
    temperature: params.temperature ?? 0.1,
    ...(params.json ? { response_format: { type: "json_object" } } : {}),
  });

  const text = response.choices[0]?.message?.content ?? "";
  return { text, provider: "groq" };
}

async function* groqStream(client: OpenAI, params: AiGenerateParams): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.prompt },
    ],
    temperature: params.temperature ?? 0.2,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}

// ── Gemini implementation ───────────────────────────────────────────────────

async function geminiGenerate(params: AiGenerateParams): Promise<AiGenerateResult> {
  const { genAI, pickModel } = await import("@/lib/gemini");
  if (!process.env.GEMINI_API_KEY) throw new Error("No AI provider available (missing both GROQ_API_KEY and GEMINI_API_KEY)");

  const model = genAI.getGenerativeModel({
    model: pickModel(),
    systemInstruction: params.system,
    generationConfig: {
      temperature: params.temperature ?? 0.1,
      ...(params.json ? { responseMimeType: "application/json" } : {}),
    },
  });

  const result = await model.generateContent(params.prompt);
  const text = result.response.text().trim();
  return { text, provider: "gemini" };
}

async function* geminiStream(params: AiGenerateParams): AsyncGenerator<string> {
  const { genAI, pickModel } = await import("@/lib/gemini");
  if (!process.env.GEMINI_API_KEY) throw new Error("No AI provider available (missing both GROQ_API_KEY and GEMINI_API_KEY)");

  const model = genAI.getGenerativeModel({
    model: pickModel(),
    systemInstruction: params.system,
    generationConfig: { temperature: params.temperature ?? 0.2 },
  });

  const stream = await model.generateContentStream(params.prompt);
  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
