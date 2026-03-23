/**
 * Startup validation for required environment variables.
 * Import this from instrumentation.ts or layout.tsx to fail fast.
 */

const REQUIRED_VARS = [
  "DATABASE_URL",
  "DATASOURCE_SECRET_KEY",
] as const;

const RECOMMENDED_VARS = [
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

let checked = false;

export function validateEnv() {
  if (checked) return;
  checked = true;

  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(
      `[envCheck] FATAL: Missing required environment variables: ${missing.join(", ")}. ` +
      `The app will not function correctly without these.`
    );
  }

  const missingRecommended = RECOMMENDED_VARS.filter((v) => !process.env[v]);
  if (missingRecommended.length > 0) {
    console.warn(
      `[envCheck] Warning: Missing recommended environment variables: ${missingRecommended.join(", ")}. ` +
      `Some features may not work.`
    );
  }
}
