import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | undefined;

export function getAdminApp(): App {
  if (!adminApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID!;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY!;
    // Handle escaped newlines
    if (privateKey?.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    });
  }
  return adminApp;
}

export async function verifyIdToken(idToken: string) {
  const app = getAdminApp();
  const auth = getAuth(app);
  return auth.verifyIdToken(idToken);
}

