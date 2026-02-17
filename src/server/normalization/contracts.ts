export type NormalizedEntityType = "orders" | "refunds" | "ad_spend" | "fees" | "payouts" | "expenses";

export type NormalizationSourceKind = "sql" | "csv" | "api";

export type NormalizedFinanceRecord = {
  entityType: NormalizedEntityType;
  sourceKind: NormalizationSourceKind;
  sourcePlatform: string;
  sourceId: string;
  occurredAt: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedBatch = {
  records: NormalizedFinanceRecord[];
  generatedAt: string;
};

export type PlatformFinanceSnapshot = {
  orders?: unknown[];
  refunds?: unknown[];
  adSpend?: unknown[];
  fees?: unknown[];
  payouts?: unknown[];
  expenses?: unknown[];
};

export interface FinanceNormalizer {
  normalize(source: PlatformFinanceSnapshot): NormalizedBatch;
}
