import type { DataSource, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AuthUser } from "@/lib/auth-server";

type EnsureResult = { user: User };

type FindParams = {
  userId: string;
  datasourceId: string;
};

export async function ensureUser(
  authUser: Exclude<AuthUser, null>,
): Promise<EnsureResult> {
  const user = await prisma.user.upsert({
    where: { id: authUser.uid },
    update: authUser.email ? { email: authUser.email } : {},
    create: {
      id: authUser.uid,
      name: authUser.email ? authUser.email.split("@")[0] || null : null,
      email: authUser.email ?? null,
    },
  });

  return { user };
}

export async function findAccessibleDataSource(
  params: FindParams,
): Promise<DataSource | null> {
  if (!params.datasourceId || !params.userId) {
    return null;
  }

  return prisma.dataSource.findFirst({
    where: {
      id: params.datasourceId,
      ownerId: params.userId,
    },
  });
}
