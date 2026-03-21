"use client";
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type ChartDisplayType = "auto" | "line" | "bar";

type Props = {
  fields: string[];
  rows: Record<string, any>[];
  /** Override the auto-detected chart type */
  chartType?: ChartDisplayType;
};

// Heuristics: prefer (date/time + numeric) → line; else (categorical + numeric) → bar
export default function ResultsChart({ fields, rows, chartType = "auto" }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] rounded-xl border border-white/[0.06] bg-white/[0.02] text-grape-400 text-sm">
        No data to chart — try a query that returns results.
      </div>
    );
  }
  const f = inferChartFields(fields, rows);
  if (!f) {
    return (
      <div className="flex items-center justify-center h-[200px] rounded-xl border border-white/[0.06] bg-white/[0.02] text-grape-400 text-sm px-4 text-center">
        This data can&apos;t be charted automatically. Switch to table view, or try a query with at least one text/date column and one numeric column.
      </div>
    );
  }

  const effectiveKind =
    chartType === "line" ? "time"
    : chartType === "bar" ? "category"
    : f.kind;

  const denseCategoryAxis = effectiveKind === "category" && rows.length > 4;
  const data = rows.map((r) => {
    const x = effectiveKind === "time" ? normalizeDate(r[f.x]) : String(r[f.x]);
    const y = Number(r[f.y]);
    return { [f.x]: x, [f.y]: y };
  });

  return (
    <div className="brand-bg w-full h-[250px] sm:h-[320px] rounded-xl p-2 sm:p-3 border border-[#2A2D3A]">
      <ResponsiveContainer>
        {effectiveKind === "time" ? (
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis dataKey={f.x} tick={{ fontSize: 10, fill: '#e5e7eb' }} stroke="#475569" />
            <YAxis tick={{ fontSize: 10, fill: '#e5e7eb' }} stroke="#475569" width={36} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={f.y} stroke="#F97316" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis
              dataKey={f.x}
              tick={{ fontSize: 10, fill: '#e5e7eb' }}
              interval={0}
              angle={denseCategoryAxis ? -32 : 0}
              height={denseCategoryAxis ? 64 : 30}
              stroke="#475569"
            />
            <YAxis tick={{ fontSize: 10, fill: '#e5e7eb' }} stroke="#475569" width={36} />
            <Tooltip />
            <Legend />
            <Bar dataKey={f.y} fill="#F97316" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function inferChartFields(fields: string[], rows: Record<string, any>[]):
  | { kind: "time"; x: string; y: string }
  | { kind: "category"; x: string; y: string }
  | null {
  const first = rows[0] || {};
  const numeric: string[] = fields.filter((k) => isNumeric(first[k]));
  const time: string[] = fields.filter((k) => isDateLike(first[k]) || /(_at|date|time)$/i.test(k));
  const categorical: string[] = fields.filter((k) => typeof first[k] === "string");

  if (time.length > 0 && numeric.length > 0) {
    return { kind: "time", x: time[0]!, y: numeric[0]! };
  }
  if (categorical.length > 0 && numeric.length > 0) {
    return { kind: "category", x: bestCategory(categorical, rows), y: numeric[0]! };
  }
  return null;
}

function bestCategory(candidates: string[], rows: Record<string, any>[]): string {
  // Pick field with lowest unique cardinality (but >1) as category
  let best = candidates[0]!;
  let bestScore = Infinity;
  for (const c of candidates) {
    const set = new Set(rows.map((r) => String(r[c])));
    const score = set.size;
    if (score > 1 && score < bestScore) {
      best = c; bestScore = score;
    }
  }
  return best;
}

function isNumeric(v: any): boolean {
  return typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)));
}

function isDateLike(v: any): boolean {
  if (v instanceof Date) return true;
  if (typeof v !== "string") return false;
  // ISO date or timestamp
  return /\d{4}-\d{2}-\d{2}/.test(v) || /T\d{2}:\d{2}:\d{2}/.test(v);
}

function normalizeDate(v: any): string {
  try {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}
