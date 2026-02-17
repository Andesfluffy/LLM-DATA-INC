import { prisma } from "@/lib/db";
import { getConnector } from "@/lib/connectors/registry";
import "@/lib/connectors/init";
import {
  computeAdEfficiency,
  computeBusinessHealthScore,
  computeCashFlowMovement,
  computeExpenseVolatility,
  computeGrossMargin,
  computeRefundRatio,
  computeRevenueGrowth,
  type MetricResult,
} from "@/src/server/metrics/domainMetrics";

interface GenerateMetricSnapshotInput {
  orgId: string;
  datasourceId: string;
  periodStart: Date;
  periodEnd: Date;
  periodGranularity?: "day" | "week" | "month";
}

interface TableColumns {
  table: string;
  columns: Set<string>;
}

type AggregateRow = Record<string, unknown>;

function parseSchema(schema: string): Map<string, Set<string>> {
  const tableColumns = new Map<string, Set<string>>();

  for (const line of schema.split("\n")) {
    const [identifier] = line.trim().split(/\s+/, 1);
    const segments = identifier?.split(".") || [];
    if (segments.length < 2) continue;
    const column = segments.pop() as string;
    const table = segments.join(".");
    if (!tableColumns.has(table)) tableColumns.set(table, new Set());
    tableColumns.get(table)!.add(column);
  }

  return tableColumns;
}

function pickFirstMatch(candidates: string[], tables: string[]): string | null {
  const lowerMap = new Map(tables.map((table) => [table.toLowerCase(), table]));

  for (const candidate of candidates) {
    const exact = lowerMap.get(candidate.toLowerCase());
    if (exact) return exact;

    const publicTable = lowerMap.get(`public.${candidate}`.toLowerCase());
    if (publicTable) return publicTable;

    for (const [lower, original] of lowerMap.entries()) {
      if (lower.endsWith(`.${candidate.toLowerCase()}`)) return original;
    }
  }

  return null;
}

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  const lowerColumns = new Map([...columns].map((column) => [column.toLowerCase(), column]));
  for (const candidate of candidates) {
    const match = lowerColumns.get(candidate.toLowerCase());
    if (match) return match;
  }
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function dateToSqlLiteral(value: Date): string {
  return `'${value.toISOString()}'`;
}

async function fetchOneAggregate(client: any, sql: string): Promise<AggregateRow> {
  const result = await client.executeQuery(sql, { timeoutMs: 10000 });
  return result.rows?.[0] ?? {};
}

function asMetric(value: number | null, complete: boolean): MetricResult {
  return {
    value,
    confidence: complete && value != null ? "high" : "low",
  };
}

export async function generateAndStoreBusinessMetricSnapshot(input: GenerateMetricSnapshotInput) {
  const periodGranularity = input.periodGranularity ?? "week";
  const periodDurationMs = input.periodEnd.getTime() - input.periodStart.getTime();
  const previousPeriodEnd = new Date(input.periodStart.getTime());
  const previousPeriodStart = new Date(input.periodStart.getTime() - periodDurationMs);

  const ds = await prisma.dataSource.findFirst({
    where: {
      id: input.datasourceId,
      orgId: input.orgId,
    },
  });

  if (!ds) {
    throw new Error("Datasource not found for org.");
  }

  const connector = getConnector(ds.type || "postgres");
  const client = await connector.createClient(ds);

  try {
    const allowedTables = await client.getAllowedTables();
    const schema = await client.getSchema(`${ds.id}:metrics`);
    const schemaMap = parseSchema(schema);

    const ordersTable = pickFirstMatch(["orders", "sales", "transactions", "invoices"], allowedTables);
    const expensesTable = pickFirstMatch(["expenses", "operating_expenses", "costs"], allowedTables);
    const cashFlowTable = pickFirstMatch(["cash_flows", "cashflow", "ledger_entries", "bank_transactions"], allowedTables);

    const getTableColumns = (table: string | null): TableColumns | null => {
      if (!table) return null;
      const columns = schemaMap.get(table) ?? schemaMap.get(table.split(".").pop() || "");
      return columns ? { table, columns } : null;
    };

    const orderTableInfo = getTableColumns(ordersTable);
    const expenseTableInfo = getTableColumns(expensesTable);
    const cashFlowTableInfo = getTableColumns(cashFlowTable);

    const orderDateCol = orderTableInfo ? pickColumn(orderTableInfo.columns, ["created_at", "order_date", "invoice_date", "date"]) : null;
    const revenueCol = orderTableInfo ? pickColumn(orderTableInfo.columns, ["total_amount", "revenue", "gross_amount", "amount"]) : null;
    const cogsCol = orderTableInfo ? pickColumn(orderTableInfo.columns, ["cogs_amount", "cost_of_goods_sold", "cost_amount", "product_cost"]) : null;
    const refundCol = orderTableInfo ? pickColumn(orderTableInfo.columns, ["refund_amount", "refunded_amount", "returns_amount"]) : null;
    const adSpendCol = orderTableInfo ? pickColumn(orderTableInfo.columns, ["ad_spend_amount", "marketing_spend", "ad_cost"]) : null;
    const adRevenueCol = orderTableInfo ? pickColumn(orderTableInfo.columns, ["ad_revenue_amount", "revenue_attributed_to_ads"]) : null;

    const expenseDateCol = expenseTableInfo ? pickColumn(expenseTableInfo.columns, ["created_at", "expense_date", "date"]) : null;
    const expenseAmountCol = expenseTableInfo ? pickColumn(expenseTableInfo.columns, ["amount", "expense_amount", "total_amount"]) : null;

    const cashDateCol = cashFlowTableInfo ? pickColumn(cashFlowTableInfo.columns, ["created_at", "transaction_date", "date"]) : null;
    const cashAmountCol = cashFlowTableInfo ? pickColumn(cashFlowTableInfo.columns, ["net_amount", "amount", "cash_delta"]) : null;

    let currentRevenue = 0;
    let previousRevenue = 0;
    let currentCogs = 0;
    let currentRefunds = 0;
    let currentAdSpend = 0;
    let currentAdRevenue = 0;

    if (orderTableInfo && orderDateCol && revenueCol) {
      const currentOrderAgg = await fetchOneAggregate(
        client,
        `SELECT
          COALESCE(SUM(${revenueCol}), 0) AS revenue,
          COALESCE(SUM(${cogsCol || "0"}), 0) AS cogs,
          COALESCE(SUM(${refundCol || "0"}), 0) AS refunds,
          COALESCE(SUM(${adSpendCol || "0"}), 0) AS ad_spend,
          COALESCE(SUM(${adRevenueCol || revenueCol}), 0) AS ad_revenue
         FROM ${orderTableInfo.table}
         WHERE ${orderDateCol} >= ${dateToSqlLiteral(input.periodStart)}
           AND ${orderDateCol} < ${dateToSqlLiteral(input.periodEnd)}`
      );

      const previousOrderAgg = await fetchOneAggregate(
        client,
        `SELECT COALESCE(SUM(${revenueCol}), 0) AS revenue
         FROM ${orderTableInfo.table}
         WHERE ${orderDateCol} >= ${dateToSqlLiteral(previousPeriodStart)}
           AND ${orderDateCol} < ${dateToSqlLiteral(previousPeriodEnd)}`
      );

      currentRevenue = toNumber(currentOrderAgg.revenue);
      previousRevenue = toNumber(previousOrderAgg.revenue);
      currentCogs = toNumber(currentOrderAgg.cogs);
      currentRefunds = toNumber(currentOrderAgg.refunds);
      currentAdSpend = toNumber(currentOrderAgg.ad_spend);
      currentAdRevenue = toNumber(currentOrderAgg.ad_revenue);
    }

    let expenseSeries: number[] = [];
    if (expenseTableInfo && expenseDateCol && expenseAmountCol) {
      const expenseRows = await client.executeQuery(
        `SELECT ${expenseAmountCol} AS expense_amount
         FROM ${expenseTableInfo.table}
         WHERE ${expenseDateCol} >= ${dateToSqlLiteral(input.periodStart)}
           AND ${expenseDateCol} < ${dateToSqlLiteral(input.periodEnd)}`,
        { timeoutMs: 10000 }
      );
      expenseSeries = expenseRows.rows.map((row: any) => toNumber(row.expense_amount));
    }

    let currentCashFlow = 0;
    let previousCashFlow = 0;
    if (cashFlowTableInfo && cashDateCol && cashAmountCol) {
      const currentCashAgg = await fetchOneAggregate(
        client,
        `SELECT COALESCE(SUM(${cashAmountCol}), 0) AS cash_flow
         FROM ${cashFlowTableInfo.table}
         WHERE ${cashDateCol} >= ${dateToSqlLiteral(input.periodStart)}
           AND ${cashDateCol} < ${dateToSqlLiteral(input.periodEnd)}`
      );

      const previousCashAgg = await fetchOneAggregate(
        client,
        `SELECT COALESCE(SUM(${cashAmountCol}), 0) AS cash_flow
         FROM ${cashFlowTableInfo.table}
         WHERE ${cashDateCol} >= ${dateToSqlLiteral(previousPeriodStart)}
           AND ${cashDateCol} < ${dateToSqlLiteral(previousPeriodEnd)}`
      );

      currentCashFlow = toNumber(currentCashAgg.cash_flow);
      previousCashFlow = toNumber(previousCashAgg.cash_flow);
    }

    const metricResults = {
      revenueGrowth: asMetric(
        computeRevenueGrowth(currentRevenue, previousRevenue),
        Boolean(orderTableInfo && orderDateCol && revenueCol)
      ),
      grossMargin: asMetric(
        computeGrossMargin(currentRevenue, currentCogs),
        Boolean(orderTableInfo && revenueCol && cogsCol)
      ),
      expenseVolatility: asMetric(
        computeExpenseVolatility(expenseSeries),
        Boolean(expenseTableInfo && expenseDateCol && expenseAmountCol)
      ),
      refundRatio: asMetric(
        computeRefundRatio(currentRefunds, currentRevenue),
        Boolean(orderTableInfo && revenueCol && refundCol)
      ),
      adEfficiency: asMetric(
        computeAdEfficiency(currentAdRevenue, currentAdSpend),
        Boolean(orderTableInfo && adSpendCol)
      ),
      cashFlowMovement: asMetric(
        computeCashFlowMovement(currentCashFlow, previousCashFlow),
        Boolean(cashFlowTableInfo && cashDateCol && cashAmountCol)
      ),
    };

    const health = computeBusinessHealthScore(metricResults);

    const metricRows = Object.entries(metricResults).map(([metricKey, result]) => ({
      orgId: input.orgId,
      datasourceId: input.datasourceId,
      periodGranularity,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      metricKey,
      metricValue: result.value,
      confidence: result.confidence,
      sourceMissing: result.confidence === "low",
    }));

    await prisma.$transaction([
      prisma.businessMetricSnapshot.deleteMany({
        where: {
          orgId: input.orgId,
          datasourceId: input.datasourceId,
          periodGranularity,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      }),
      prisma.businessMetricSnapshot.createMany({ data: metricRows }),
      prisma.businessHealthScore.upsert({
        where: {
          orgId_datasourceId_periodGranularity_periodStart_periodEnd: {
            orgId: input.orgId,
            datasourceId: input.datasourceId,
            periodGranularity,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
          },
        },
        update: {
          score: health.score,
          componentContributions: health.components,
        },
        create: {
          orgId: input.orgId,
          datasourceId: input.datasourceId,
          periodGranularity,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          score: health.score,
          componentContributions: health.components,
        },
      }),
    ]);

    return {
      metrics: metricRows,
      healthScore: health,
    };
  } finally {
    await client.disconnect();
  }
}
