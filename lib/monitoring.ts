/**
 * Monitoring utilities: anomaly detection and schedule checking.
 */

type Schedule = {
  enabled?: boolean;
  timezone?: string;
  weeklyReportDay?: number;   // 0=Sun … 6=Sat (UTC)
  weeklyReportHour?: number;
  weeklyReportMinute?: number;
  revenueDropThreshold?: number;
  expenseSpikeThreshold?: number;
  refundSpikeThreshold?: number;
  marginDropThreshold?: number;
};

type Metrics = {
  revenue?: number;
  expense?: number;
  refund?: number;
  margin?: number;
};

type AnomalyFinding = {
  kind: "revenue_drop" | "expense_spike" | "refund_spike" | "margin_compression";
  value: number;
  threshold: number;
};

/**
 * Returns true if `now` falls within `windowMinutes` of the
 * configured weekly report time (UTC).
 */
export function isScheduleDueNow(
  schedule: Schedule,
  now: Date,
  windowMinutes: number,
): boolean {
  if (!schedule.enabled) return false;

  const day = now.getUTCDay();
  if (day !== schedule.weeklyReportDay) return false;

  const scheduledMinutes =
    (schedule.weeklyReportHour ?? 9) * 60 + (schedule.weeklyReportMinute ?? 0);
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  return Math.abs(currentMinutes - scheduledMinutes) <= windowMinutes;
}

/**
 * Compares current period metrics to the previous period and
 * returns a list of anomalies that exceeded configured thresholds.
 */
export function detectAnomalies(options: {
  schedule: Schedule;
  current: Metrics;
  previous: Metrics;
}): AnomalyFinding[] {
  const { schedule, current, previous } = options;
  const findings: AnomalyFinding[] = [];

  if (
    schedule.revenueDropThreshold != null &&
    previous.revenue != null &&
    previous.revenue > 0 &&
    current.revenue != null
  ) {
    const drop = (previous.revenue - current.revenue) / previous.revenue;
    if (drop >= schedule.revenueDropThreshold) {
      findings.push({ kind: "revenue_drop", value: drop, threshold: schedule.revenueDropThreshold });
    }
  }

  if (
    schedule.expenseSpikeThreshold != null &&
    previous.expense != null &&
    previous.expense > 0 &&
    current.expense != null
  ) {
    const spike = (current.expense - previous.expense) / previous.expense;
    if (spike >= schedule.expenseSpikeThreshold) {
      findings.push({ kind: "expense_spike", value: spike, threshold: schedule.expenseSpikeThreshold });
    }
  }

  if (
    schedule.refundSpikeThreshold != null &&
    previous.refund != null &&
    previous.refund > 0 &&
    current.refund != null
  ) {
    const spike = (current.refund - previous.refund) / previous.refund;
    if (spike >= schedule.refundSpikeThreshold) {
      findings.push({ kind: "refund_spike", value: spike, threshold: schedule.refundSpikeThreshold });
    }
  }

  if (
    schedule.marginDropThreshold != null &&
    previous.margin != null &&
    previous.margin > 0 &&
    current.margin != null
  ) {
    const drop = (previous.margin - current.margin) / previous.margin;
    if (drop >= schedule.marginDropThreshold) {
      findings.push({ kind: "margin_compression", value: drop, threshold: schedule.marginDropThreshold });
    }
  }

  return findings;
}
