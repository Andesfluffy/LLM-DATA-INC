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

type Props = {
  fields: string[];
  rows: Record<string, any>[];
};

// Heuristics: prefer (date/time + numeric) → line; else (categorical + numeric) → bar
export default function ResultsChart({ fields, rows }: Props) {
  if (!rows || rows.length === 0) return null;
  const f = inferChartFields(fields, rows);
  if (!f) return null;
  const data = rows.map((r) => {
    const x = f.kind === "time" ? normalizeDate(r[f.x]) : String(r[f.x]);
    const y = Number(r[f.y]);
    return { [f.x]: x, [f.y]: y };
  });

  return (
    <div style={{ width: "100%", height: 320 }} className="brand-bg rounded-xl p-3 border border-[#2A2D3A]">
      <ResponsiveContainer>
        {f.kind === "time" ? (
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis dataKey={f.x} tick={{ fontSize: 12, fill: '#e5e7eb' }} stroke="#475569" />
            <YAxis tick={{ fontSize: 12, fill: '#e5e7eb' }} stroke="#475569" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={f.y} stroke="#F97316" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis dataKey={f.x} tick={{ fontSize: 12, fill: '#e5e7eb' }} interval={0} angle={data.length > 6 ? -25 : 0} height={data.length > 6 ? 60 : 30} stroke="#475569" />
            <YAxis tick={{ fontSize: 12, fill: '#e5e7eb' }} stroke="#475569" />
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
    return { kind: "time", x: time[0], y: numeric[0] };
  }
  if (categorical.length > 0 && numeric.length > 0) {
    return { kind: "category", x: bestCategory(categorical, rows), y: numeric[0] };
  }
  return null;
}

function bestCategory(candidates: string[], rows: Record<string, any>[]): string {
  // Pick field with lowest unique cardinality (but >1) as category
  let best = candidates[0];
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
