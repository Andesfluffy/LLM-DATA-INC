import type { Org, OrgRole, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AuthUser } from "@/lib/auth-server";
import { ensureUserAndOrg } from "@/lib/userOrg";

export type OrgPermission =
  | "settings:read"
  | "settings:write"
  | "datasource:edit"
  | "reporting:run"
  | "reporting:manage"
  | "security:admin";

const PERMISSIONS: Record<OrgRole, Set<OrgPermission>> = {
  owner: new Set(["settings:read", "settings:write", "datasource:edit", "reporting:run", "reporting:manage", "security:admin"]),
  admin: new Set(["settings:read", "settings:write", "datasource:edit", "reporting:run", "reporting:manage", "security:admin"]),
  analyst: new Set(["settings:read", "reporting:run", "reporting:manage"]),
  viewer: new Set(["settings:read", "reporting:run"]),
};

export type OrgAccess = {
  user: User;
  org: Org;
  role: OrgRole;
};

export async function requireOrgPermission(authUser: Exclude<AuthUser, null>, permission: OrgPermission, requestedOrgId?: string): Promise<OrgAccess | null> {
  const { user, org } = await ensureUserAndOrg(authUser);
  if (requestedOrgId && requestedOrgId !== org.id) return null;

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
  });

  const role = membership?.role ?? "viewer";
  if (!PERMISSIONS[role].has(permission)) return null;

  return { user, org, role };
}

export async function assertIpAllowlisted(orgId: string, ip: string | null): Promise<boolean> {
  const entries = await prisma.ipAllowlistEntry.findMany({ where: { orgId, enabled: true } });
  if (!entries.length) return true;
  if (!ip) return false;
  return entries.some((entry) => entry.cidr === ip || entry.cidr === `${ip}/32`);
}

export function getRequestIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip") || null;
}
