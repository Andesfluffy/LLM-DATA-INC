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

// Cache Prisma clients per URL — bounded LRU with TTL to prevent connection leaks.
const MAX_CACHED_CLIENTS = 20;
const CLIENT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const clientCache = new Map<string, { client: PrismaClientLike; lastUsed: number }>();

function evictStaleClients() {
  const now = Date.now();
  for (const [url, entry] of clientCache) {
    if (now - entry.lastUsed > CLIENT_TTL_MS) {
      entry.client.$disconnect().catch(() => {});
      clientCache.delete(url);
    }
  }
  // If still over limit, evict oldest
  if (clientCache.size > MAX_CACHED_CLIENTS) {
    let oldest: [string, { lastUsed: number }] | null = null;
    for (const [url, entry] of clientCache) {
      if (!oldest || entry.lastUsed < oldest[1].lastUsed) oldest = [url, entry];
    }
    if (oldest) {
      (clientCache.get(oldest[0]) as any)?.client?.$disconnect().catch(() => {});
      clientCache.delete(oldest[0]);
    }
  }
}

export function getPrismaForUrl(url: string): PrismaClientLike {
  const existing = clientCache.get(url);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.client;
  }
  evictStaleClients();
  const { PrismaClient } = require("@prisma/client");
  const client = new PrismaClient({ datasources: { db: { url } } });
  clientCache.set(url, { client, lastUsed: Date.now() });
  return client;
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
