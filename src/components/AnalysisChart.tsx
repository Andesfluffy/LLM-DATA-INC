"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

export type ChartConfig = {
  type: "bar" | "bar-horizontal" | "line" | "area" | "pie" | "number";
  xKey: string;
  yKey: string;
  title: string;
};

type Props = {
  config: ChartConfig;
  rows: Record<string, unknown>[];
  printMode?: boolean;
};

const PALETTE = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];
const PALETTE_PRINT = ["#ea580c", "#2563eb", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2", "#db2777"];

function abbrev(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function fmtTooltip(v: unknown) {
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString();
}

export default function AnalysisChart({ config, rows, printMode = false }: Props) {
  if (!rows || rows.length === 0) return null;

  const palette = printMode ? PALETTE_PRINT : PALETTE;
  const gridColor = printMode ? "#d1d5db" : "#2A2D3A";
  const tickFill = printMode ? "#374151" : "#e5e7eb";
  const axisStroke = printMode ? "#9ca3af" : "#475569";
  const bgClass = printMode ? "bg-white border-gray-200" : "brand-bg border-[#2A2D3A]";

  // ── Single-value stat card ────────────────────────────────────────────
  if (config.type === "number") {
    const raw = rows[0]?.[config.yKey];
    const num = Number(raw);
    const formatted = !isNaN(num) ? num.toLocaleString() : String(raw ?? "—");
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border py-10 px-6 ${
          printMode ? "border-gray-200 bg-gray-50" : "border-accent/20 bg-accent/5"
        }`}
      >
        <p className={`text-5xl font-bold tracking-tight ${printMode ? "text-orange-600" : "text-accent"}`}>
          {formatted}
        </p>
        <p className={`mt-2 text-sm ${printMode ? "text-gray-500" : "text-slate-400"}`}>
          {config.title}
        </p>
      </div>
    );
  }

  // Normalise rows
  const data = rows.map((r) => ({
    ...r,
    [config.xKey]: String(r[config.xKey] ?? ""),
    [config.yKey]: Number(r[config.yKey] ?? 0),
  }));

  // Identify max value index for highlighting
  const maxIdx = data.reduce(
    (mi, d, i) => (Number(d[config.yKey]) > Number(data[mi]?.[config.yKey] ?? -Infinity) ? i : mi),
    0
  );

  // Average reference line value
  const avg = data.reduce((sum, d) => sum + Number(d[config.yKey]), 0) / data.length;

  const manyCategories = config.type === "bar" && data.length > 5;
  const chartHeight = printMode ? 300 : undefined;

  const container = (
    <div
      className={`w-full rounded-xl border p-2 sm:p-3 ${bgClass}`}
      style={{ height: chartHeight ?? undefined }}
    >
      <div className={printMode ? "h-[300px]" : "h-[280px] sm:h-[340px]"}>
        <ResponsiveContainer width="100%" height="100%">
          {/* ── Horizontal bar ── */}
          {config.type === "bar-horizontal" ? (
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: tickFill }}
                stroke={axisStroke}
                tickFormatter={abbrev}
              />
              <YAxis
                type="category"
                dataKey={config.xKey}
                width={110}
                tick={{ fontSize: 10, fill: tickFill }}
                stroke={axisStroke}
              />
              <Tooltip formatter={fmtTooltip} />
              <ReferenceLine x={avg} stroke={printMode ? "#9ca3af" : "#64748b"} strokeDasharray="4 4" label={{ value: "avg", fontSize: 9, fill: tickFill }} />
              <Bar dataKey={config.yKey} radius={[0, 3, 3, 0]}>
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === maxIdx ? palette[0]! : printMode ? "#fdba74" : "rgba(249,115,22,0.55)"}
                  />
                ))}
                <LabelList
                  dataKey={config.yKey}
                  position="right"
                  style={{ fontSize: 10, fill: tickFill }}
                  formatter={abbrev}
                />
              </Bar>
            </BarChart>
          ) : config.type === "line" ? (
            /* ── Line ── */
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey={config.xKey} tick={{ fontSize: 10, fill: tickFill }} stroke={axisStroke} />
              <YAxis tick={{ fontSize: 10, fill: tickFill }} stroke={axisStroke} width={44} tickFormatter={abbrev} />
              <Tooltip formatter={fmtTooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey={config.yKey}
                stroke={palette[0]!}
                strokeWidth={2}
                dot={data.length <= 40}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : config.type === "area" ? (
            /* ── Area ── */
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette[0]!} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={palette[0]!} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey={config.xKey} tick={{ fontSize: 10, fill: tickFill }} stroke={axisStroke} />
              <YAxis tick={{ fontSize: 10, fill: tickFill }} stroke={axisStroke} width={44} tickFormatter={abbrev} />
              <Tooltip formatter={fmtTooltip} />
              <Legend />
              <Area
                type="monotone"
                dataKey={config.yKey}
                stroke={palette[0]!}
                fill="url(#areaGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          ) : config.type === "pie" ? (
            /* ── Pie ── */
            <PieChart>
              <Pie
                data={data}
                dataKey={config.yKey}
                nameKey={config.xKey}
                cx="50%"
                cy="45%"
                outerRadius={110}
                label={({ name, percent }) =>
                  percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                }
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]!} />
                ))}
              </Pie>
              <Tooltip formatter={fmtTooltip} />
              <Legend />
            </PieChart>
          ) : (
            /* ── Vertical bar (default) ── */
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey={config.xKey}
                tick={{ fontSize: 10, fill: tickFill }}
                interval={0}
                angle={manyCategories ? -35 : 0}
                height={manyCategories ? 72 : 30}
                stroke={axisStroke}
              />
              <YAxis tick={{ fontSize: 10, fill: tickFill }} stroke={axisStroke} width={44} tickFormatter={abbrev} />
              <Tooltip formatter={fmtTooltip} />
              <ReferenceLine y={avg} stroke={printMode ? "#9ca3af" : "#64748b"} strokeDasharray="4 4" label={{ value: "avg", fontSize: 9, fill: tickFill, position: "insideTopRight" }} />
              <Bar dataKey={config.yKey} radius={[3, 3, 0, 0]}>
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === maxIdx ? palette[0]! : printMode ? "#fdba74" : "rgba(249,115,22,0.55)"}
                  />
                ))}
                <LabelList
                  dataKey={config.yKey}
                  position="top"
                  style={{ fontSize: 9, fill: tickFill }}
                  formatter={abbrev}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {config.title && (
        <p className={`text-xs font-semibold uppercase tracking-wide ${printMode ? "text-gray-500" : "text-slate-500"}`}>
          {config.title}
        </p>
      )}
      {container}
    </div>
  );
}
