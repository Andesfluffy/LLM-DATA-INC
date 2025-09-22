import { prisma } from "@/lib/db";

export async function getUserDataSources(userId: string) {
  return prisma.dataSource.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' } });
}

