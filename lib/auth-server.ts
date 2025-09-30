import { NextRequest } from "next/server";
import type { Org, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyIdToken } from "@/lib/firebase/admin";

export type AuthUser = { uid: string; email?: string | null } | null;

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser> {
  const authz = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authz) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authz);
  if (!m) return null;
  try {
    const token = await verifyIdToken(m[1]!);
    return { uid: token.uid, email: token.email || null };
  } catch {
    return null;
  }
}

export type AppUserContext = { user: User; org: Org };

export async function getOrCreateUserOrg(uid: string, email?: string | null): Promise<AppUserContext> {
  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { id: uid } });
    if (!user) {
      user = await tx.user.create({
        data: {
          id: uid,
          email: email ?? undefined,
          name: email ?? undefined,
        },
      });
    } else if (email && user.email !== email) {
      user = await tx.user.update({
        where: { id: uid },
        data: {
          email,
          name: user.name ?? email,
        },
      });
    }

    let org: Org | null = null;
    if (user.orgId) {
      org = await tx.org.findUnique({ where: { id: user.orgId } });
    }

    if (!org) {
      org = await tx.org.create({
        data: {
          name: user.email ? `${user.email}'s Workspace` : `Workspace ${uid.slice(0, 8)}`,
        },
      });
      user = await tx.user.update({
        where: { id: user.id },
        data: { orgId: org.id },
      });
    } else if (!user.orgId) {
      user = await tx.user.update({
        where: { id: user.id },
        data: { orgId: org.id },
      });
    }

    return { user, org };
  });
}

export async function getUserOrgFromRequest(req: NextRequest): Promise<(AppUserContext & { auth: NonNullable<AuthUser> }) | null> {
  const auth = await getUserFromRequest(req);
  if (!auth) return null;
  const context = await getOrCreateUserOrg(auth.uid, auth.email);
  return { ...context, auth };
}
