import { prisma } from "@/lib/db";
import { decryptIntegrationSecret, type IntegrationPlatform } from "@/src/server/integrations/types";
import { getIntegrationsFromMetadata, withIntegrationMetadata } from "@/src/server/integrations/metadata";
import { runPlatformNormalization } from "@/src/server/integrations/registry";

export async function syncIntegrationDataSource(dataSourceId: string, platform: IntegrationPlatform) {
  const ds = await prisma.dataSource.findFirst({ where: { id: dataSourceId } });
  if (!ds) throw new Error("Data source not found");

  const integrations = getIntegrationsFromMetadata(ds.metadata);
  const existing = integrations[platform];
  if (!existing) throw new Error(`No ${platform} integration is configured for this data source`);

  const started = new Date().toISOString();
  await prisma.dataSource.update({
    where: { id: ds.id },
    data: {
      metadata: withIntegrationMetadata(ds.metadata, platform, {
        ...existing,
        sync: {
          ...existing.sync,
          status: "syncing",
          lastSyncAttemptAt: started,
          error: null,
        },
      }),
    },
  });

  try {
    const secret = decryptIntegrationSecret(existing.encryptedSecret);
    const normalized = await runPlatformNormalization(platform, secret);

    const normalizedMetadata = {
      generatedAt: normalized.generatedAt,
      count: normalized.records.length,
      rows: normalized.records,
    };

    const refreshed = await prisma.dataSource.findFirst({ where: { id: ds.id } });
    await prisma.dataSource.update({
      where: { id: ds.id },
      data: {
        metadata: {
          ...(refreshed?.metadata as Record<string, unknown> || {}),
          normalizedFinance: {
            ...(((refreshed?.metadata as any)?.normalizedFinance || {}) as Record<string, unknown>),
            [platform]: normalizedMetadata,
          },
          ...withIntegrationMetadata(refreshed?.metadata, platform, {
            ...existing,
            sync: {
              ...existing.sync,
              status: "ok",
              error: null,
              lastSyncAttemptAt: started,
              lastSuccessfulSyncAt: new Date().toISOString(),
            },
          }),
        },
      },
    });

    return { ok: true, ingestedRecords: normalized.records.length };
  } catch (error: any) {
    const failedAt = new Date().toISOString();
    const refreshed = await prisma.dataSource.findFirst({ where: { id: ds.id } });
    await prisma.dataSource.update({
      where: { id: ds.id },
      data: {
        metadata: withIntegrationMetadata(refreshed?.metadata, platform, {
          ...existing,
          sync: {
            ...existing.sync,
            status: "error",
            lastSyncAttemptAt: failedAt,
            error: String(error?.message || error),
          },
        }),
      },
    });
    throw error;
  }
}
