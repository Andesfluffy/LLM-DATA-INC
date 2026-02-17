import type { DataSource, Org, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AuthUser } from "@/lib/auth-server";

type EnsureResult = { user: User; org: Org };

type FindParams = {
  userId: string;
  datasourceId: string;
  orgId?: string;
};

type PrismaClientLike = {
  org: { upsert(args: any): Promise<Org> };
  user: { upsert(args: any): Promise<User> };
  orgMonitorSchedule: { upsert(args: any): Promise<any> };
  dataSource: { findFirst(args: any): Promise<DataSource | null> };
};

function getPersonalOrgId(uid: string): string {
  return `org_${uid}`;
}

function inferOrgName(email?: string | null): string {
  if (!email) return "Personal Workspace";
  const handle = email.split("@")[0] || email;
  return `${handle}'s Workspace`;
}

export async function ensureUserAndOrg(
  authUser: Exclude<AuthUser, null>,
  client: PrismaClientLike = prisma as unknown as PrismaClientLike
): Promise<EnsureResult> {
  const orgId = getPersonalOrgId(authUser.uid);
  const org = await client.org.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: inferOrgName(authUser.email || null) },
  });

  const userUpdate: Record<string, any> = { orgId: org.id };
  if (authUser.email) {
    userUpdate.email = authUser.email;
  }

  const user = await client.user.upsert({
    where: { id: authUser.uid },
    update: userUpdate,
    create: {
      id: authUser.uid,
      name: authUser.email ? authUser.email.split("@")[0] || null : null,
      email: authUser.email ?? null,
      orgId: org.id,
    },
  });

  await client.orgMonitorSchedule.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      weeklyReportDay: 1,
      weeklyReportHour: 9,
      weeklyReportMinute: 0,
      timezone: "UTC",
    },
  });

  return { user, org };
}

export async function findAccessibleDataSource(
  params: FindParams,
  client: PrismaClientLike = prisma as unknown as PrismaClientLike
): Promise<DataSource | null> {
  if (!params.datasourceId || !params.userId) {
    return null;
  }

  const where: Record<string, any> = {
    id: params.datasourceId,
    OR: [
      { ownerId: params.userId },
      { org: { users: { some: { id: params.userId } } } },
    ],
  };

  if (params.orgId) {
    where.orgId = params.orgId;
  }

  return client.dataSource.findFirst({ where });
}
