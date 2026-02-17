import { describe, expect, it } from "vitest";

import {
  computeAdEfficiency,
  computeBusinessHealthScore,
  computeCashFlowMovement,
  computeExpenseVolatility,
  computeGrossMargin,
  computeRefundRatio,
  computeRevenueGrowth,
} from "@/src/server/metrics/domainMetrics";

describe("domain business metrics", () => {
  it("computes KPI formulas", () => {
    expect(computeRevenueGrowth(1200, 1000)).toBe(20);
    expect(computeGrossMargin(1000, 350)).toBe(65);
    expect(computeExpenseVolatility([100, 120, 80, 100])).toBeGreaterThan(0);
    expect(computeRefundRatio(20, 1000)).toBe(2);
    expect(computeAdEfficiency(900, 300)).toBe(3);
    expect(computeCashFlowMovement(200, 100)).toBe(100);
  });

  it("returns null when denominator data is invalid", () => {
    expect(computeRevenueGrowth(100, 0)).toBeNull();
    expect(computeGrossMargin(0, 10)).toBeNull();
    expect(computeRefundRatio(5, 0)).toBeNull();
    expect(computeAdEfficiency(100, 0)).toBeNull();
    expect(computeCashFlowMovement(100, 0)).toBeNull();
  });

  it("builds a weighted explainable score", () => {
    const scored = computeBusinessHealthScore({
      revenueGrowth: { value: 15, confidence: "high" },
      grossMargin: { value: 52, confidence: "high" },
      expenseVolatility: { value: 10, confidence: "high" },
      refundRatio: { value: 3, confidence: "high" },
      adEfficiency: { value: 2.6, confidence: "high" },
      cashFlowMovement: { value: 8, confidence: "high" },
    });

    expect(scored.score).toBeGreaterThan(0);
    expect(scored.score).toBeLessThanOrEqual(100);
    expect(scored.components).toHaveLength(6);
    expect(scored.components[0]).toHaveProperty("weightedContribution");
  });
});
