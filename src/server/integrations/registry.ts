import { fetchShopifyFinanceSnapshot, shopifyNormalizer } from "@/src/server/integrations/shopify";
import { fetchStripeFinanceSnapshot, stripeNormalizer } from "@/src/server/integrations/stripe";
import type { IntegrationPlatform, IntegrationSecretInput } from "@/src/server/integrations/types";
import type { NormalizedBatch } from "@/src/server/normalization/contracts";

export async function runPlatformNormalization(
  platform: IntegrationPlatform,
  secret: IntegrationSecretInput,
): Promise<NormalizedBatch> {
  if (platform === "stripe") {
    const snapshot = await fetchStripeFinanceSnapshot(secret);
    return stripeNormalizer.normalize(snapshot);
  }

  if (platform === "shopify") {
    const snapshot = await fetchShopifyFinanceSnapshot(secret);
    return shopifyNormalizer.normalize(snapshot);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}
