import type { IntegrationConfig, IntegrationMetadataMap, IntegrationPlatform } from "@/src/server/integrations/types";

export function getIntegrationsFromMetadata(metadata: unknown): IntegrationMetadataMap {
  if (!metadata || typeof metadata !== "object") return {};
  const source = metadata as Record<string, unknown>;
  const integrations = source.integrations;
  if (!integrations || typeof integrations !== "object") return {};
  return integrations as IntegrationMetadataMap;
}

export function withIntegrationMetadata(
  metadata: unknown,
  platform: IntegrationPlatform,
  config: IntegrationConfig,
): Record<string, unknown> {
  const base = metadata && typeof metadata === "object" ? { ...(metadata as Record<string, unknown>) } : {};
  const existing = getIntegrationsFromMetadata(base);
  return {
    ...base,
    integrations: {
      ...existing,
      [platform]: config,
    },
  };
}

export function redactIntegrationConfig(config: IntegrationConfig) {
  const { encryptedSecret: _encryptedSecret, ...rest } = config;
  return {
    ...rest,
    hasSecret: Boolean(config.encryptedSecret?.ciphertext),
  };
}
