import { PrismaClient } from "@prisma/client";

// Primary app DB client (NextAuth, settings, audit)
export const prisma = new PrismaClient();

// Cache Prisma clients per URL for data source querying
const clientCache = new Map<string, PrismaClient>();

export function getPrismaForUrl(url: string): PrismaClient {
  if (!clientCache.has(url)) {
    clientCache.set(
      url,
      new PrismaClient({ datasources: { db: { url } } })
    );
  }
  return clientCache.get(url)!;
}

export async function getActiveDataSourceUrlForUser(userId: string): Promise<string> {
  const ds = await prisma.dataSource.findFirst({ where: { ownerId: userId } });
  return ds?.url || process.env.DEFAULT_DATASOURCE_URL || process.env.DATABASE_URL!;
}

