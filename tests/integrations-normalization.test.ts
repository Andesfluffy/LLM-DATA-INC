import { describe, expect, it } from "vitest";

import { stripeNormalizer } from "@/src/server/integrations/stripe";
import { shopifyNormalizer } from "@/src/server/integrations/shopify";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "@/src/server/integrations/types";

process.env.DATASOURCE_SECRET_KEY = process.env.DATASOURCE_SECRET_KEY || "01234567890123456789012345678901";

describe("integration normalizers", () => {
  it("normalizes stripe finance objects into shared finance contracts", () => {
    const result = stripeNormalizer.normalize({
      orders: [{ id: "ord_1", amount: 1200, currency: "usd", created: "2025-01-01T00:00:00.000Z" }],
      refunds: [{ id: "rf_1", amount: 100, currency: "usd", created: "2025-01-02T00:00:00.000Z" }],
    });

    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      entityType: "orders",
      sourceKind: "api",
      sourcePlatform: "stripe",
      sourceId: "ord_1",
      amount: 1200,
      currency: "USD",
    });
    expect(result.records[1]).toMatchObject({
      entityType: "refunds",
      sourcePlatform: "stripe",
      sourceId: "rf_1",
    });
  });

  it("normalizes shopify finance objects into shared finance contracts", () => {
    const result = shopifyNormalizer.normalize({
      orders: [{ id: 77, total_price: "901.25", currency: "cad", processed_at: "2025-02-01T00:00:00.000Z" }],
      payouts: [{ id: "po_1", net: "120.4", currency: "cad", date: "2025-02-02T00:00:00.000Z" }],
    });

    expect(result.records).toHaveLength(2);
    expect(result.records.map((r) => r.entityType)).toEqual(["orders", "payouts"]);
    expect(result.records[0]?.amount).toBe(901.25);
    expect(result.records[1]?.currency).toBe("CAD");
  });

  it("encrypts/decrypts integration OAuth and API key secrets", () => {
    const encryptedApi = encryptIntegrationSecret({ apiKey: "sk_test_123" });
    const decryptedApi = decryptIntegrationSecret(encryptedApi);
    expect(decryptedApi.apiKey).toBe("sk_test_123");

    const encryptedOauth = encryptIntegrationSecret({
      oauth: { accessToken: "access", refreshToken: "refresh", expiresAt: "2026-01-01T00:00:00.000Z" },
    });
    const decryptedOauth = decryptIntegrationSecret(encryptedOauth);
    expect(decryptedOauth.oauth?.accessToken).toBe("access");
    expect(decryptedOauth.oauth?.refreshToken).toBe("refresh");
  });
});
