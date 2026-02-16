import { NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export type AuthUser = { uid: string; email?: string | null } | null;
export const AUTH_ERROR_MESSAGE =
  "Unauthorized. Please sign in again. If this keeps happening, verify Firebase client/admin environment variables and token forwarding.";

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser> {
  const authz = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authz) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth-server] No Authorization header found in request");
    }
    return null;
  }
  const m = /^Bearer\s+(.+)$/i.exec(authz);
  if (!m) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth-server] Authorization header does not match Bearer format");
    }
    return null;
  }
  try {
    const token = await verifyIdToken(m[1]!);
    return { uid: token.uid, email: token.email || null };
  } catch (error: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[auth-server] Token verification failed:",
        error?.message || String(error)
      );
    }
    return null;
  }
}
