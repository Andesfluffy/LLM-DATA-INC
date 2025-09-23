// Lazy-load Prisma to avoid initializing the native engine during Next build.
type PrismaClientLike = any;

let _appClient: PrismaClientLike | null = null;
function getAppClient(): PrismaClientLike {
  if (!_appClient) {
    // Use require to avoid static import at build time
    const { PrismaClient } = require("@prisma/client");
    _appClient = new PrismaClient();
  }
  return _appClient;
}

// Primary app DB client (NextAuth, settings, audit)
export const prisma = new Proxy({}, {
  get(_t, p) {
    // @ts-ignore
    return getAppClient()[p];
  },
}) as PrismaClientLike;

// Cache Prisma clients per URL for data source querying
const clientCache = new Map<string, PrismaClientLike>();

export function getPrismaForUrl(url: string): PrismaClientLike {
  if (!clientCache.has(url)) {
    const { PrismaClient } = require("@prisma/client");
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
