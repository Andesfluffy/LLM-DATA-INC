import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

function getConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

function getOrInitApp() {
  if (getApps().length) return getApps()[0]!;
  const config = getConfig();
  const missing = Object.entries(config)
    .filter(([, v]) => !v || String(v).trim() === "")
    .map(([k]) => k);
  if (missing.length) {
    const msg = `Missing Firebase client env: ${missing.join(", ")}. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID in .env and restart dev server.`;
    console.error(msg);
    throw new Error(msg);
  }
  return initializeApp(config);
}

// Lazy-initialize: only validate config when the app is actually used at runtime,
// not during Next.js static page generation at build time.
let _app: ReturnType<typeof initializeApp> | null = null;
function getLazyApp() {
  if (!_app) _app = getOrInitApp();
  return _app;
}

export const firebaseApp = new Proxy({} as ReturnType<typeof initializeApp>, {
  get(_t, p) { return (getLazyApp() as any)[p]; },
});
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_t, p) { return (getAuth(getLazyApp()) as any)[p]; },
});
export const googleProvider = new GoogleAuthProvider();
