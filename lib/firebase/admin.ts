import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | undefined;

function requireEnv(name: "FIREBASE_PROJECT_ID" | "FIREBASE_CLIENT_EMAIL" | "FIREBASE_PRIVATE_KEY"): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing Firebase admin environment variable: ${name}`);
  }
  return value;
}

export function getAdminApp(): App {
  if (!adminApp) {
    try {
      const projectId = requireEnv("FIREBASE_PROJECT_ID");
      const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
      let privateKey = requireEnv("FIREBASE_PRIVATE_KEY");
      // Handle escaped newlines
      if (privateKey?.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey })
      });
      if (process.env.NODE_ENV !== "production") {
        console.log("[firebase-admin] Admin app initialized successfully");
      }
    } catch (error: any) {
      console.error("[firebase-admin] Failed to initialize admin app:", error?.message || String(error));
      throw error;
    }
  }
  return adminApp;
}

export async function verifyIdToken(idToken: string) {
  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(idToken);
    if (process.env.NODE_ENV !== "production") {
      console.log("[firebase-admin] Token verified successfully for user:", decodedToken.uid);
    }
    return decodedToken;
  } catch (error: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[firebase-admin] Token verification failed:",
        error?.code || error?.message || String(error)
      );
    }
    throw error;
  }
}
