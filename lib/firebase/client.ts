import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

type FirebaseClient = { app: FirebaseApp; auth: Auth; googleProvider: GoogleAuthProvider };

let client: FirebaseClient | null = null;
let initError: Error | null = null;
let initialized = false;

function initFirebase() {
  if (initialized) return;
  initialized = true;
  const missing: string[] = [];
  for (const [k, v] of Object.entries(config)) {
    if (!v || String(v).trim() === "") missing.push(k);
  }
  if (missing.length) {
    const msg = `Missing Firebase client env: ${missing.join(", ")}. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID in .env.`;
    initError = new Error(msg);
    if (process.env.NODE_ENV !== "production") console.warn(msg);
    return;
  }
  const app = getApps()[0] ?? initializeApp(config);
  client = { app, auth: getAuth(app), googleProvider: new GoogleAuthProvider() };
}

export function getFirebaseClient(): FirebaseClient {
  initFirebase();
  if (client) return client;
  throw initError ?? new Error("Firebase client failed to initialize");
}

export function tryGetFirebaseClient(): FirebaseClient | null {
  try {
    return getFirebaseClient();
  } catch {
    return null;
  }
}
