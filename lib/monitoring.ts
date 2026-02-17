import type { OrgMonitorSchedule } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getConnector } from "@/lib/connectors/registry";
import { triggerAlertForAnomaly } from "@/lib/alerts/service";
import "@/lib/connectors/init";

type KpiSummary = {
  revenue: number;
  expense: number;
  refund: number;
  margin: number;
};

type DetectionContext = {
  schedule: OrgMonitorSchedule;
  current: KpiSummary;
  previous: KpiSummary;
};

type FindingDraft = {
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description?: string;
  currentValue?: number;
  previousValue?: number;
  changeRatio?: number;
};

export function getWindowRange(now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);

  const currentStart = new Date(end);
  currentStart.setUTCDate(currentStart.getUTCDate() - 7);

  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - 7);

  return {
    currentStart,
    currentEnd: end,
    previousStart,
    previousEnd: currentStart,
  };
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function quoteIdent(identifier: string, dialect: "postgresql" | "mysql" | "sqlite") {
  const safe = identifier.split(".").map((part) => part.trim()).filter(Boolean);
  if (safe.length === 0) return identifier;

  const quote = dialect === "mysql" ? "`" : '"';
  return safe.map((part) => `${quote}${part.replaceAll(quote, "")}${quote}`).join(".");
}

function maybeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function selectCandidateTable(schemaText: string): {
  table: string;
  dateColumn: string;
  revenueColumn?: string;
  expenseColumn?: string;
  refundColumn?: string;
  marginColumn?: string;
} | null {
  const lines = schemaText.split("\n").map((l) => l.trim()).filter(Boolean);
  const byTable = new Map<string, Set<string>>();

  for (const line of lines) {
    const [name] = line.split(/\s+/);
    if (!name) continue;
    const parts = name.split(".");
    if (parts.length < 2) continue;
    const column = parts.pop() as string;
    const table = parts.join(".");

    if (!byTable.has(table)) byTable.set(table, new Set());
    byTable.get(table)!.add(column.toLowerCase());
  }

  const dateCandidates = ["date", "created_at", "transaction_date", "invoice_date", "order_date"];
  const revenueCandidates = ["revenue", "sales", "gross_sales", "amount", "total_revenue"];
  const expenseCandidates = ["expense", "cost", "spend", "cogs", "total_expense"];
  const refundCandidates = ["refund", "refund_amount", "returns", "total_refund"];
  const marginCandidates = ["margin", "profit", "gross_margin", "net_margin"];

  for (const [table, cols] of byTable.entries()) {
    const dateColumn = dateCandidates.find((c) => cols.has(c));
    if (!dateColumn) continue;

    const revenueColumn = revenueCandidates.find((c) => cols.has(c));
    const expenseColumn = expenseCandidates.find((c) => cols.has(c));
    const refundColumn = refundCandidates.find((c) => cols.has(c));
    const marginColumn = marginCandidates.find((c) => cols.has(c));

    if (revenueColumn || expenseColumn || refundColumn || marginColumn) {
      return { table, dateColumn, revenueColumn, expenseColumn, refundColumn, marginColumn };
    }
  }

  return null;
}

function computeSummary(rows: Record<string, unknown>[]): KpiSummary {
  return rows.reduce<KpiSummary>(
    (acc, row) => {
      acc.revenue += maybeNumber(row.revenue);
      acc.expense += maybeNumber(row.expense);
      acc.refund += maybeNumber(row.refund);
      acc.margin += maybeNumber(row.margin);
      return acc;
    },
    { revenue: 0, expense: 0, refund: 0, margin: 0 }
  );
}

function changeRatio(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0;
  return (current - previous) / Math.abs(previous);
}

export function detectAnomalies(ctx: DetectionContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const revenueDelta = changeRatio(ctx.current.revenue, ctx.previous.revenue);
  if (revenueDelta <= -Math.abs(ctx.schedule.revenueDropThreshold)) {
    findings.push({
      kind: "revenue_drop",
      severity: "critical",
      title: "Week-over-week revenue drop detected",
      description: `Revenue declined ${(Math.abs(revenueDelta) * 100).toFixed(1)}% versus last week.`,
      currentValue: ctx.current.revenue,
      previousValue: ctx.previous.revenue,
      changeRatio: revenueDelta,
    });
  }

  const expenseDelta = changeRatio(ctx.current.expense, ctx.previous.expense);
  if (expenseDelta >= Math.abs(ctx.schedule.expenseSpikeThreshold)) {
    findings.push({
      kind: "expense_spike",
      severity: "warning",
      title: "Expense spike detected",
      description: `Expenses increased ${(expenseDelta * 100).toFixed(1)}% versus last week.`,
      currentValue: ctx.current.expense,
      previousValue: ctx.previous.expense,
      changeRatio: expenseDelta,
    });
  }

  const refundDelta = changeRatio(ctx.current.refund, ctx.previous.refund);
  if (refundDelta >= Math.abs(ctx.schedule.refundSpikeThreshold)) {
    findings.push({
      kind: "refund_spike",
      severity: "warning",
      title: "Refund spike detected",
      description: `Refund volume increased ${(refundDelta * 100).toFixed(1)}% versus last week.`,
      currentValue: ctx.current.refund,
      previousValue: ctx.previous.refund,
      changeRatio: refundDelta,
    });
  }

  const marginDelta = changeRatio(ctx.current.margin, ctx.previous.margin);
  if (marginDelta <= -Math.abs(ctx.schedule.marginDropThreshold)) {
    findings.push({
      kind: "margin_compression",
      severity: "critical",
      title: "Margin compression detected",
      description: `Margin decreased ${(Math.abs(marginDelta) * 100).toFixed(1)}% versus last week.`,
      currentValue: ctx.current.margin,
      previousValue: ctx.previous.margin,
      changeRatio: marginDelta,
    });
  }

  return findings;
}

function getZonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(date);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[map.get("weekday") || "Sun"] ?? 0,
    hour: Number(map.get("hour") || "0"),
    minute: Number(map.get("minute") || "0"),
  };
}

export function isScheduleDueNow(schedule: OrgMonitorSchedule, now = new Date(), toleranceMinutes = 20) {
  if (!schedule.enabled) return false;

  let zoned: { weekday: number; hour: number; minute: number };
  try {
    zoned = getZonedParts(now, schedule.timezone || "UTC");
  } catch {
    zoned = getZonedParts(now, "UTC");
  }

  if (zoned.weekday !== schedule.weeklyReportDay) return false;

  const currentMinutes = zoned.hour * 60 + zoned.minute;
  const targetMinutes = schedule.weeklyReportHour * 60 + schedule.weeklyReportMinute;
  return Math.abs(currentMinutes - targetMinutes) <= toleranceMinutes;
}

export async function runMonitorForDataSource(params: {
  orgId: string;
  dataSourceId: string;
  schedule: OrgMonitorSchedule;
  trigger?: string;
}) {
  const ds = await prisma.dataSource.findFirst({ where: { id: params.dataSourceId, orgId: params.orgId } });
  if (!ds) return { status: "skipped", reason: "datasource_not_found" as const };

  const windows = getWindowRange();
  const run = await prisma.monitorRun.create({
    data: {
      orgId: params.orgId,
      dataSourceId: ds.id,
      status: "running",
      trigger: params.trigger || "cron",
      windowStart: windows.currentStart,
      windowEnd: windows.currentEnd,
    },
  });

  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);

  try {
    const schema = await client.getSchema({ cacheKey: `${ds.id}:${Date.now()}` });
    const candidate = selectCandidateTable(schema);

    if (!candidate) {
      await prisma.monitorFinding.create({
        data: {
          runId: run.id,
          kind: "insufficient_schema",
          severity: "info",
          title: "Schema refresh succeeded but KPI columns were not detected",
          description: "No supported date/metric columns were found for revenue/expense/refund/margin checks.",
        },
      });

      await prisma.monitorRun.update({
        where: { id: run.id },
        data: { status: "completed", schemaRefreshed: true, completedAt: new Date() },
      });
      return { status: "completed", runId: run.id };
    }

    const table = quoteIdent(candidate.table, factory.dialect);
    const dateColumn = quoteIdent(candidate.dateColumn, factory.dialect);
    const revenueExpr = candidate.revenueColumn
      ? `COALESCE(${quoteIdent(candidate.revenueColumn, factory.dialect)}, 0) AS revenue`
      : "0 AS revenue";
    const expenseExpr = candidate.expenseColumn
      ? `COALESCE(${quoteIdent(candidate.expenseColumn, factory.dialect)}, 0) AS expense`
      : "0 AS expense";
    const refundExpr = candidate.refundColumn
      ? `COALESCE(${quoteIdent(candidate.refundColumn, factory.dialect)}, 0) AS refund`
      : "0 AS refund";
    const marginExpr = candidate.marginColumn
      ? `COALESCE(${quoteIdent(candidate.marginColumn, factory.dialect)}, 0) AS margin`
      : candidate.revenueColumn && candidate.expenseColumn
        ? `COALESCE(${quoteIdent(candidate.revenueColumn, factory.dialect)}, 0) - COALESCE(${quoteIdent(candidate.expenseColumn, factory.dialect)}, 0) AS margin`
        : "0 AS margin";

    const sqlCurrent = `SELECT ${revenueExpr}, ${expenseExpr}, ${refundExpr}, ${marginExpr} FROM ${table} WHERE ${dateColumn} >= '${isoDate(
      windows.currentStart
    )}' AND ${dateColumn} < '${isoDate(windows.currentEnd)}'`;
    const sqlPrevious = `SELECT ${revenueExpr}, ${expenseExpr}, ${refundExpr}, ${marginExpr} FROM ${table} WHERE ${dateColumn} >= '${isoDate(
      windows.previousStart
    )}' AND ${dateColumn} < '${isoDate(windows.previousEnd)}'`;

    const [currentRows, previousRows] = await Promise.all([
      client.executeQuery(sqlCurrent, { timeoutMs: 15000 }),
      client.executeQuery(sqlPrevious, { timeoutMs: 15000 }),
    ]);

    const current = computeSummary(currentRows.rows);
    const previous = computeSummary(previousRows.rows);

    await prisma.kpiSnapshot.createMany({
      data: [
        {
          orgId: params.orgId,
          dataSourceId: ds.id,
          runId: run.id,
          windowStart: windows.currentStart,
          windowEnd: windows.currentEnd,
          metrics: current,
        },
        {
          orgId: params.orgId,
          dataSourceId: ds.id,
          runId: run.id,
          windowStart: windows.previousStart,
          windowEnd: windows.previousEnd,
          metrics: previous,
        },
      ],
    });

    const findings = detectAnomalies({ schedule: params.schedule, current, previous });
    if (findings.length > 0) {
      await prisma.monitorFinding.createMany({
        data: findings.map((f) => ({
          runId: run.id,
          kind: f.kind,
          severity: f.severity,
          title: f.title,
          description: f.description,
          currentValue: f.currentValue,
          previousValue: f.previousValue,
          changeRatio: f.changeRatio,
        })),
      });

      // Trigger alert rules for each finding
      const anomalyTypeMap: Record<string, "revenue_drop" | "expense_spike" | "refund_anomaly"> = {
        revenue_drop: "revenue_drop",
        expense_spike: "expense_spike",
        refund_spike: "refund_anomaly",
        margin_compression: "revenue_drop",
      };

      for (const finding of findings) {
        const anomalyType = anomalyTypeMap[finding.kind];
        if (!anomalyType || finding.currentValue === undefined) continue;
        try {
          await triggerAlertForAnomaly({
            orgId: params.orgId,
            metric: finding.kind,
            observedValue: Math.abs(finding.changeRatio ?? 0) * 100,
            anomalyType,
            dedupKey: `${run.id}:${finding.kind}`,
            metadata: { runId: run.id, currentValue: finding.currentValue, previousValue: finding.previousValue },
            windowLabel: `${isoDate(windows.currentStart)} to ${isoDate(windows.currentEnd)}`,
          });
        } catch {
          // Alert delivery failure should not break the monitoring run
        }
      }
    }

    await prisma.monitorRun.update({
      where: { id: run.id },
      data: { status: "completed", schemaRefreshed: true, completedAt: new Date() },
    });

    return { status: "completed", runId: run.id, findingCount: findings.length };
  } catch (error: any) {
    const message = String(error?.message || error);
    await prisma.monitorRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        retryCount: { increment: 1 },
        error: message.slice(0, 2000),
      },
    });

    return { status: "failed", runId: run.id, error: message };
  } finally {
    await client.disconnect();
  }
}
