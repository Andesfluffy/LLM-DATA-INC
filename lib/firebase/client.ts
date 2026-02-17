import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserSessionPersistence, setPersistence } from "firebase/auth";

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
// Session-only persistence: auth clears when all browser tabs are closed.
// Prevents walk-up access on shared machines.
let _authReady: Promise<void> | null = null;
function getSessionAuth() {
  const a = getAuth(getLazyApp());
  if (!_authReady) {
    _authReady = setPersistence(a, browserSessionPersistence).catch(() => {});
  }
  return a;
}
/** Ensures the app + auth are initialized and persistence is configured. */
export function authReady() {
  // Trigger lazy init so _authReady is always set before we return.
  getSessionAuth();
  return _authReady!;
}
/** Return the real Auth instance (not a Proxy). Safe to pass to Firebase SDK functions. */
export function getRealAuth() {
  return getSessionAuth();
}
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_t, p) { return (getSessionAuth() as any)[p]; },
});
export const googleProvider = new GoogleAuthProvider();
