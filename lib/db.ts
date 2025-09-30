import { getDataSourceConnectionUrl } from "./datasourceSecrets";

// Lazy-load Prisma to avoid initializing the native engine during Next build.
type PrismaClientLike = any;

let _appClient: PrismaClientLike | null = null;
let overrideAppClient: PrismaClientLike | null = null;

function getAppClient(): PrismaClientLike {
  if (overrideAppClient) {
    return overrideAppClient;
  }
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

export function setAppPrismaClientForTesting(client: PrismaClientLike | null) {
  overrideAppClient = client;
  if (!client) {
    _appClient = null;
  }
}

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
  if (!ds) {
    const fallback = process.env.DEFAULT_DATASOURCE_URL || process.env.DATABASE_URL;
    if (!fallback) {
      throw new Error("No active data source configured and no fallback DATABASE_URL present");
    }
    return fallback;
  }
  try {
    return getDataSourceConnectionUrl(ds);
  } catch (error) {
    console.error("Failed to resolve active data source URL", error);
    const fallback = process.env.DEFAULT_DATASOURCE_URL || process.env.DATABASE_URL;
    if (!fallback) {
      throw new Error("Unable to resolve encrypted data source URL and no fallback available");
    }
    return fallback;
  }
}
