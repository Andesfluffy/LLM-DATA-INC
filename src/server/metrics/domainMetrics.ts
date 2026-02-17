export type MetricConfidence = "high" | "low";

export interface MetricResult {
  value: number | null;
  confidence: MetricConfidence;
}

export interface HealthComponent {
  metricKey: string;
  weight: number;
  rawValue: number;
  normalizedScore: number;
  weightedContribution: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const safePercent = (numerator: number, denominator: number): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return (numerator / denominator) * 100;
};

export function computeRevenueGrowth(currentRevenue: number, previousRevenue: number): number | null {
  if (!Number.isFinite(currentRevenue) || !Number.isFinite(previousRevenue) || previousRevenue === 0) {
    return null;
  }
  return ((currentRevenue - previousRevenue) / Math.abs(previousRevenue)) * 100;
}

export function computeGrossMargin(revenue: number, costOfGoodsSold: number): number | null {
  return safePercent(revenue - costOfGoodsSold, revenue);
}

export function computeExpenseVolatility(expenseSeries: number[]): number | null {
  const samples = expenseSeries.filter((n) => Number.isFinite(n));
  if (samples.length < 2) return null;

  const mean = samples.reduce((sum, n) => sum + n, 0) / samples.length;
  if (mean === 0) return null;

  const variance =
    samples.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / samples.length;
  const standardDeviation = Math.sqrt(variance);

  return (standardDeviation / Math.abs(mean)) * 100;
}

export function computeRefundRatio(refundedAmount: number, grossRevenue: number): number | null {
  return safePercent(refundedAmount, grossRevenue);
}

export function computeAdEfficiency(revenueAttributedToAds: number, adSpend: number): number | null {
  if (!Number.isFinite(revenueAttributedToAds) || !Number.isFinite(adSpend) || adSpend === 0) {
    return null;
  }
  return revenueAttributedToAds / adSpend;
}

export function computeCashFlowMovement(currentNetCashFlow: number, previousNetCashFlow: number): number | null {
  if (!Number.isFinite(currentNetCashFlow) || !Number.isFinite(previousNetCashFlow) || previousNetCashFlow === 0) {
    return null;
  }
  return ((currentNetCashFlow - previousNetCashFlow) / Math.abs(previousNetCashFlow)) * 100;
}

const METRIC_WEIGHTS = {
  revenueGrowth: 0.22,
  grossMargin: 0.2,
  expenseVolatility: 0.14,
  refundRatio: 0.14,
  adEfficiency: 0.14,
  cashFlowMovement: 0.16,
} as const;

function normalizeLinear(value: number, min: number, max: number): number {
  if (min === max) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function normalizeInverseLinear(value: number, min: number, max: number): number {
  return 100 - normalizeLinear(value, min, max);
}

export function computeBusinessHealthScore(metrics: {
  revenueGrowth: MetricResult;
  grossMargin: MetricResult;
  expenseVolatility: MetricResult;
  refundRatio: MetricResult;
  adEfficiency: MetricResult;
  cashFlowMovement: MetricResult;
}): { score: number; components: HealthComponent[] } {
  const normalized = {
    revenueGrowth: metrics.revenueGrowth.value == null ? null : normalizeLinear(metrics.revenueGrowth.value, -20, 40),
    grossMargin: metrics.grossMargin.value == null ? null : normalizeLinear(metrics.grossMargin.value, 0, 80),
    expenseVolatility:
      metrics.expenseVolatility.value == null
        ? null
        : normalizeInverseLinear(metrics.expenseVolatility.value, 0, 60),
    refundRatio: metrics.refundRatio.value == null ? null : normalizeInverseLinear(metrics.refundRatio.value, 0, 30),
    adEfficiency: metrics.adEfficiency.value == null ? null : normalizeLinear(metrics.adEfficiency.value, 0, 8),
    cashFlowMovement:
      metrics.cashFlowMovement.value == null ? null : normalizeLinear(metrics.cashFlowMovement.value, -30, 30),
  };

  const entries = Object.entries(METRIC_WEIGHTS) as Array<[keyof typeof METRIC_WEIGHTS, number]>;
  const activeWeight = entries.reduce((sum, [key, weight]) => (normalized[key] == null ? sum : sum + weight), 0);

  if (activeWeight === 0) {
    return { score: 0, components: [] };
  }

  const components: HealthComponent[] = [];
  let weightedTotal = 0;

  for (const [key, baseWeight] of entries) {
    const rawValue = metrics[key].value;
    const normalizedScore = normalized[key];
    if (rawValue == null || normalizedScore == null) continue;

    const effectiveWeight = baseWeight / activeWeight;
    const weightedContribution = normalizedScore * effectiveWeight;
    weightedTotal += weightedContribution;

    components.push({
      metricKey: key,
      weight: Number(effectiveWeight.toFixed(4)),
      rawValue,
      normalizedScore: Number(normalizedScore.toFixed(2)),
      weightedContribution: Number(weightedContribution.toFixed(2)),
    });
  }

  return {
    score: Number(clamp(weightedTotal, 0, 100).toFixed(2)),
    components,
  };
}
