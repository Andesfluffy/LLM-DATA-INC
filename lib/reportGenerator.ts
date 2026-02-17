import { prisma } from "@/lib/db";
import { getConnector } from "@/lib/connectors/registry";
import { openaiClient, pickModel } from "@/lib/openai";
import type { DataSource } from "@prisma/client";
import "@/lib/connectors/init";

type MetricSummary = {
  currentRevenue: number;
  previousRevenue: number;
  revenueDeltaPct: number;
  currentMarginPct: number;
  previousMarginPct: number;
  marginDeltaPct: number;
  currentExpenses: number;
  previousExpenses: number;
  expenseDeltaPct: number;
};

type ProductTrend = {
  name: string;
  currentRevenue: number;
  previousRevenue: number;
  deltaPct: number;
};

type WeeklyReportPayload = {
  period: { start: string; end: string; previousStart: string; previousEnd: string };
  healthScore: number;
  summary: string;
  topProducts: ProductTrend[];
  decliningProducts: ProductTrend[];
  keyDrivers: string[];
  recommendations: string[];
  metrics: MetricSummary;
};

function toWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const dayOffset = utcDay === 0 ? 6 : utcDay - 1;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOffset - (offsetWeeks * 7)));
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - 7);
  const previousEnd = new Date(start);

  return { start, end, previousStart, previousEnd };
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function getActiveDataSource(orgId: string, userId: string): Promise<DataSource | null> {
  return prisma.dataSource.findFirst({
    where: {
      OR: [{ orgId }, { ownerId: userId }],
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function queryRows(ds: DataSource, sql: string) {
  const factory = getConnector(ds.type || "postgres");
  const client = await factory.createClient(ds);
  try {
    const result = await client.executeQuery(sql, { timeoutMs: 12000 });
    return result.rows;
  } catch {
    return [];
  } finally {
    await client.disconnect();
  }
}

async function computeMetrics(ds: DataSource, start: Date, end: Date, previousStart: Date, previousEnd: Date): Promise<MetricSummary> {
  const metricsSql = `
  WITH bounds AS (
    SELECT
      TIMESTAMP '${start.toISOString()}' AS current_start,
      TIMESTAMP '${end.toISOString()}' AS current_end,
      TIMESTAMP '${previousStart.toISOString()}' AS previous_start,
      TIMESTAMP '${previousEnd.toISOString()}' AS previous_end
  )
  SELECT
    COALESCE(SUM(CASE WHEN s.occurred_at >= b.current_start AND s.occurred_at < b.current_end THEN s.qty * s.unit_price END), 0) AS current_revenue,
    COALESCE(SUM(CASE WHEN s.occurred_at >= b.previous_start AND s.occurred_at < b.previous_end THEN s.qty * s.unit_price END), 0) AS previous_revenue,
    COALESCE(SUM(CASE WHEN s.occurred_at >= b.current_start AND s.occurred_at < b.current_end THEN s.qty * (s.unit_price - COALESCE(p.cost, p.unit_cost, p.price * 0.7, 0)) END), 0) AS current_margin,
    COALESCE(SUM(CASE WHEN s.occurred_at >= b.previous_start AND s.occurred_at < b.previous_end THEN s.qty * (s.unit_price - COALESCE(p.cost, p.unit_cost, p.price * 0.7, 0)) END), 0) AS previous_margin,
    COALESCE((SELECT SUM(CASE WHEN e.occurred_at >= b.current_start AND e.occurred_at < b.current_end THEN e.amount END) FROM expenses e), 0) AS current_expenses,
    COALESCE((SELECT SUM(CASE WHEN e.occurred_at >= b.previous_start AND e.occurred_at < b.previous_end THEN e.amount END) FROM expenses e), 0) AS previous_expenses
  FROM sales s
  LEFT JOIN products p ON p.id = s.product_id
  CROSS JOIN bounds b;
  `;

  const rows = await queryRows(ds, metricsSql);
  const row = rows[0] || {};

  const currentRevenue = num(row.current_revenue);
  const previousRevenue = num(row.previous_revenue);
  const currentMargin = num(row.current_margin);
  const previousMargin = num(row.previous_margin);
  const currentExpenses = num(row.current_expenses);
  const previousExpenses = num(row.previous_expenses);

  const currentMarginPct = currentRevenue === 0 ? 0 : (currentMargin / currentRevenue) * 100;
  const previousMarginPct = previousRevenue === 0 ? 0 : (previousMargin / previousRevenue) * 100;

  return {
    currentRevenue,
    previousRevenue,
    revenueDeltaPct: pctDelta(currentRevenue, previousRevenue),
    currentMarginPct,
    previousMarginPct,
    marginDeltaPct: pctDelta(currentMarginPct, previousMarginPct),
    currentExpenses,
    previousExpenses,
    expenseDeltaPct: pctDelta(currentExpenses, previousExpenses),
  };
}

async function computeProductTrends(ds: DataSource, start: Date, end: Date, previousStart: Date, previousEnd: Date): Promise<ProductTrend[]> {
  const sql = `
  WITH periodized AS (
    SELECT
      COALESCE(p.name, CONCAT('product_', s.product_id::text)) AS product_name,
      CASE
        WHEN s.occurred_at >= TIMESTAMP '${start.toISOString()}' AND s.occurred_at < TIMESTAMP '${end.toISOString()}' THEN 'current'
        WHEN s.occurred_at >= TIMESTAMP '${previousStart.toISOString()}' AND s.occurred_at < TIMESTAMP '${previousEnd.toISOString()}' THEN 'previous'
      END AS period,
      s.qty * s.unit_price AS revenue
    FROM sales s
    LEFT JOIN products p ON p.id = s.product_id
    WHERE s.occurred_at >= TIMESTAMP '${previousStart.toISOString()}'
      AND s.occurred_at < TIMESTAMP '${end.toISOString()}'
  )
  SELECT
    product_name,
    COALESCE(SUM(CASE WHEN period = 'current' THEN revenue END), 0) AS current_revenue,
    COALESCE(SUM(CASE WHEN period = 'previous' THEN revenue END), 0) AS previous_revenue
  FROM periodized
  GROUP BY product_name
  ORDER BY current_revenue DESC
  LIMIT 10;
  `;

  const rows = await queryRows(ds, sql);
  return rows.map((row) => {
    const currentRevenue = num(row.current_revenue);
    const previousRevenue = num(row.previous_revenue);
    return {
      name: String(row.product_name || "Unknown"),
      currentRevenue,
      previousRevenue,
      deltaPct: pctDelta(currentRevenue, previousRevenue),
    };
  });
}

function computeHealthScore(metrics: MetricSummary, topProducts: ProductTrend[]): number {
  let score = 65;
  score += Math.max(-20, Math.min(20, metrics.revenueDeltaPct * 0.5));
  score += Math.max(-12, Math.min(12, metrics.marginDeltaPct * 0.4));
  score += Math.max(-8, Math.min(8, (0 - metrics.expenseDeltaPct) * 0.25));
  const positiveProducts = topProducts.filter((p) => p.deltaPct > 0).length;
  score += Math.min(8, positiveProducts * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function generateNarrative(payload: {
  metrics: MetricSummary;
  topProducts: ProductTrend[];
  decliningProducts: ProductTrend[];
}): Promise<{ summary: string; keyDrivers: string[]; recommendations: string[] }> {
  const fallback = {
    summary: `Revenue moved ${payload.metrics.revenueDeltaPct.toFixed(1)}% week-over-week while margin changed ${payload.metrics.marginDeltaPct.toFixed(1)}%. Focus on stabilizing declining products and controlling spend growth of ${payload.metrics.expenseDeltaPct.toFixed(1)}%.`,
    keyDrivers: [
      "Revenue trend is primarily shaped by the top two products this week.",
      "Margin movement follows pricing mix and estimated unit economics.",
      "Expense shifts appear in operating spend captured for the week.",
    ],
    recommendations: [
      "Run pricing and discount audits on declining SKUs.",
      "Shift marketing budget toward products with positive momentum.",
      "Review high-growth expense categories and set spend guardrails.",
    ],
  };

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const prompt = `Generate concise weekly business report narrative in JSON with keys summary, keyDrivers[], recommendations[].\nMetrics: ${JSON.stringify(payload.metrics)}\nTop products: ${JSON.stringify(payload.topProducts)}\nDeclining products: ${JSON.stringify(payload.decliningProducts)}\nConstraints: summary max 3 sentences. keyDrivers max 4 bullets. recommendations max 4 bullets.`;
    const resp = await openaiClient.chat.completions.create({
      model: pickModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a CFO analyst writing plain-language causes and recommendations." },
        { role: "user", content: prompt },
      ],
    });
    const parsed = JSON.parse(resp.choices?.[0]?.message?.content || "{}");
    return {
      summary: String(parsed.summary || fallback.summary),
      keyDrivers: Array.isArray(parsed.keyDrivers) ? parsed.keyDrivers.slice(0, 4).map(String) : fallback.keyDrivers,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4).map(String) : fallback.recommendations,
    };
  } catch {
    return fallback;
  }
}

function renderMarkdown(payload: WeeklyReportPayload): string {
  return `# Weekly Business Report\n\n**Period:** ${payload.period.start.slice(0, 10)} → ${payload.period.end.slice(0, 10)}  
**Health score:** ${payload.healthScore}/100\n\n## Overview\n${payload.summary}\n\n## Revenue & Margin Deltas\n- Revenue: **$${payload.metrics.currentRevenue.toFixed(2)}** (${payload.metrics.revenueDeltaPct.toFixed(1)}% vs prior week)\n- Margin: **${payload.metrics.currentMarginPct.toFixed(1)}%** (${payload.metrics.marginDeltaPct.toFixed(1)}% delta)\n- Expenses: **$${payload.metrics.currentExpenses.toFixed(2)}** (${payload.metrics.expenseDeltaPct.toFixed(1)}% vs prior week)\n\n## Top Products\n${payload.topProducts.map((p) => `- ${p.name}: $${p.currentRevenue.toFixed(2)} (${p.deltaPct.toFixed(1)}%)`).join("\n") || "- No product data found"}\n\n## Declining Products\n${payload.decliningProducts.map((p) => `- ${p.name}: $${p.currentRevenue.toFixed(2)} (${p.deltaPct.toFixed(1)}%)`).join("\n") || "- No declining products this week"}\n\n## Major Expense Shifts\n- Weekly expense change: ${payload.metrics.expenseDeltaPct.toFixed(1)}%\n\n## Causes\n${payload.keyDrivers.map((d) => `- ${d}`).join("\n")}\n\n## Recommended Actions\n${payload.recommendations.map((r) => `- ${r}`).join("\n")}\n`;
}

export async function generateWeeklyBusinessReport(orgId: string, userId: string, offsetWeeks = 0) {
  const period = toWeekRange(offsetWeeks);
  const ds = await getActiveDataSource(orgId, userId);
  if (!ds) {
    throw new Error("No data source connected for this workspace");
  }

  const metrics = await computeMetrics(ds, period.start, period.end, period.previousStart, period.previousEnd);
  const productTrends = await computeProductTrends(ds, period.start, period.end, period.previousStart, period.previousEnd);
  const topProducts = [...productTrends].sort((a, b) => b.currentRevenue - a.currentRevenue).slice(0, 3);
  const decliningProducts = [...productTrends].filter((p) => p.deltaPct < 0).sort((a, b) => a.deltaPct - b.deltaPct).slice(0, 3);
  const healthScore = computeHealthScore(metrics, topProducts);
  const narrative = await generateNarrative({ metrics, topProducts, decliningProducts });

  const jsonContent: WeeklyReportPayload = {
    period: {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      previousStart: period.previousStart.toISOString(),
      previousEnd: period.previousEnd.toISOString(),
    },
    healthScore,
    summary: narrative.summary,
    topProducts,
    decliningProducts,
    keyDrivers: narrative.keyDrivers,
    recommendations: narrative.recommendations,
    metrics,
  };

  const markdownContent = renderMarkdown(jsonContent);

  const report = await prisma.weeklyBusinessReport.upsert({
    where: {
      orgId_periodStart_periodEnd: {
        orgId,
        periodStart: period.start,
        periodEnd: period.end,
      },
    },
    create: {
      orgId,
      periodStart: period.start,
      periodEnd: period.end,
      healthScore,
      summary: narrative.summary,
      markdownContent,
      jsonContent: jsonContent as any,
      sections: {
        create: [
          { key: "overview", title: "Health score overview", markdown: narrative.summary, jsonData: { healthScore, summary: narrative.summary }, sortOrder: 1 },
          { key: "revenue_margin", title: "Revenue and margin deltas", markdown: `Revenue ${metrics.revenueDeltaPct.toFixed(1)}%, margin ${metrics.marginDeltaPct.toFixed(1)}%`, jsonData: metrics as any, sortOrder: 2 },
          { key: "products", title: "Top and declining products", markdown: `Top: ${topProducts.map((p) => p.name).join(", ")}; Declining: ${decliningProducts.map((p) => p.name).join(", ")}`, jsonData: { topProducts, decliningProducts } as any, sortOrder: 3 },
          { key: "expenses", title: "Major expense shifts", markdown: `Expenses changed ${metrics.expenseDeltaPct.toFixed(1)}%`, jsonData: { currentExpenses: metrics.currentExpenses, previousExpenses: metrics.previousExpenses, expenseDeltaPct: metrics.expenseDeltaPct } as any, sortOrder: 4 },
          { key: "actions", title: "Causes and recommendations", markdown: `${narrative.keyDrivers.map((d) => `- ${d}`).join("\n")}\n${narrative.recommendations.map((r) => `- ${r}`).join("\n")}`, jsonData: { keyDrivers: narrative.keyDrivers, recommendations: narrative.recommendations } as any, sortOrder: 5 },
        ],
      },
      deliveries: { create: { orgId, channel: "in_app", status: "generated" } },
    },
    update: {
      healthScore,
      summary: narrative.summary,
      markdownContent,
      jsonContent: jsonContent as any,
      generatedAt: new Date(),
      sections: {
        deleteMany: {},
        create: [
          { key: "overview", title: "Health score overview", markdown: narrative.summary, jsonData: { healthScore, summary: narrative.summary }, sortOrder: 1 },
          { key: "revenue_margin", title: "Revenue and margin deltas", markdown: `Revenue ${metrics.revenueDeltaPct.toFixed(1)}%, margin ${metrics.marginDeltaPct.toFixed(1)}%`, jsonData: metrics as any, sortOrder: 2 },
          { key: "products", title: "Top and declining products", markdown: `Top: ${topProducts.map((p) => p.name).join(", ")}; Declining: ${decliningProducts.map((p) => p.name).join(", ")}`, jsonData: { topProducts, decliningProducts } as any, sortOrder: 3 },
          { key: "expenses", title: "Major expense shifts", markdown: `Expenses changed ${metrics.expenseDeltaPct.toFixed(1)}%`, jsonData: { currentExpenses: metrics.currentExpenses, previousExpenses: metrics.previousExpenses, expenseDeltaPct: metrics.expenseDeltaPct } as any, sortOrder: 4 },
          { key: "actions", title: "Causes and recommendations", markdown: `${narrative.keyDrivers.map((d) => `- ${d}`).join("\n")}\n${narrative.recommendations.map((r) => `- ${r}`).join("\n")}`, jsonData: { keyDrivers: narrative.keyDrivers, recommendations: narrative.recommendations } as any, sortOrder: 5 },
        ],
      },
      deliveries: { create: { orgId, channel: "in_app", status: "regenerated" } },
    },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });

  return report;
}
