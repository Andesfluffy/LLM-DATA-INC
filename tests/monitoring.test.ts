import { describe, expect, it } from "vitest";
import { detectAnomalies, isScheduleDueNow } from "@/lib/monitoring";

describe("monitoring schedule", () => {
  it("matches weekly schedule in timezone window", () => {
    const schedule = {
      enabled: true,
      timezone: "UTC",
      weeklyReportDay: 1,
      weeklyReportHour: 9,
      weeklyReportMinute: 0,
    } as any;

    const now = new Date("2026-01-12T09:10:00.000Z"); // Monday
    expect(isScheduleDueNow(schedule, now, 15)).toBe(true);
  });

  it("detects configured anomalies", () => {
    const findings = detectAnomalies({
      schedule: {
        revenueDropThreshold: 0.15,
        expenseSpikeThreshold: 0.2,
        refundSpikeThreshold: 0.2,
        marginDropThreshold: 0.1,
      } as any,
      current: { revenue: 70, expense: 60, refund: 30, margin: 10 },
      previous: { revenue: 100, expense: 40, refund: 10, margin: 25 },
    });

    expect(findings.map((f) => f.kind).sort()).toEqual([
      "expense_spike",
      "margin_compression",
      "refund_spike",
      "revenue_drop",
    ]);
  });
});
