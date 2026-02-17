import type { FinanceNormalizer, NormalizedFinanceRecord, PlatformFinanceSnapshot } from "@/src/server/normalization/contracts";
import type { IntegrationSecretInput } from "@/src/server/integrations/types";

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapRecords(entityType: NormalizedFinanceRecord["entityType"], source: unknown[] = []): NormalizedFinanceRecord[] {
  return source.map((raw: any, index) => ({
    entityType,
    sourceKind: "api",
    sourcePlatform: "stripe",
    sourceId: String(raw?.id || `${entityType}_${index}`),
    occurredAt: String(raw?.created || raw?.date || new Date().toISOString()),
    amount: asNumber(raw?.amount ?? raw?.gross ?? raw?.net),
    currency: String(raw?.currency || "USD").toUpperCase(),
    metadata: raw && typeof raw === "object" ? raw : undefined,
  }));
}

export const stripeNormalizer: FinanceNormalizer = {
  normalize(source: PlatformFinanceSnapshot) {
    const records: NormalizedFinanceRecord[] = [
      ...mapRecords("orders", source.orders),
      ...mapRecords("refunds", source.refunds),
      ...mapRecords("ad_spend", source.adSpend),
      ...mapRecords("fees", source.fees),
      ...mapRecords("payouts", source.payouts),
      ...mapRecords("expenses", source.expenses),
    ];

    return { records, generatedAt: new Date().toISOString() };
  },
};

export async function fetchStripeFinanceSnapshot(_secret: IntegrationSecretInput): Promise<PlatformFinanceSnapshot> {
  // Placeholder adapter for external Stripe API fetch. Kept deterministic for local testing.
  return {
    orders: [],
    refunds: [],
    adSpend: [],
    fees: [],
    payouts: [],
    expenses: [],
  };
}
