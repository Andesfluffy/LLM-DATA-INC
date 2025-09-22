import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

function assertFirebaseConfig() {
  const missing: string[] = [];
  for (const [k, v] of Object.entries(config)) {
    if (!v || String(v).trim() === "") missing.push(k);
  }
  if (missing.length) {
    const msg = `Missing Firebase client env: ${missing.join(", ")}. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID in .env and restart dev server.`;
    if (process.env.NODE_ENV !== "production") console.error(msg);
    throw new Error(msg);
  }
}

assertFirebaseConfig();

export const firebaseApp = getApps().length ? getApps()[0]! : initializeApp(config);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
