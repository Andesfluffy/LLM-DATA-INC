import { NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export type AuthUser = { uid: string; email?: string | null } | null;

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser> {
  const authz = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authz) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authz);
  if (!m) return null;
  const rawToken = m[1];
  if (!rawToken) return null;
  try {
    const token = await verifyIdToken(rawToken);
    return { uid: token.uid, email: token.email || null };
  } catch {
    return null;
  }
}

