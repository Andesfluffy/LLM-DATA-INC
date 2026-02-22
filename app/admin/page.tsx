"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, CheckCircle2, Clock, TrendingUp, AlertCircle } from "lucide-react";
import RequireAuth from "@/src/components/RequireAuth";
import { getAuthHeaders } from "@/lib/uploadUtils";

type Stats = {
  totalQueries: number;
  successfulQueries: number;
  successRate: number;
  avgDurationMs: number;
  activeUsersLast30d: number;
  daily: { date: string; success: number; total: number }[];
  topQuestions: { question: string; count: number }[];
  errorBreakdown: { status: string; count: number }[];
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 space-y-1">
      <div className="flex items-center gap-2 text-grape-400 text-xs font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-grape-500">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/admin/stats", { headers });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setStats(data as Stats);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <RequireAuth title="Admin" description="Usage analytics for Data Vista">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Usage Analytics</h1>
          <p className="text-sm text-grape-400 mt-1">Aggregate stats across all users. Only visible to admins.</p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.04]" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300 text-sm">Access denied</p>
              <p className="text-xs text-rose-400 mt-1">{error}. Make sure ADMIN_EMAIL is set and matches your account.</p>
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                label="Total queries"
                value={stats.totalQueries.toLocaleString()}
              />
              <StatCard
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Success rate"
                value={`${stats.successRate}%`}
                sub={`${stats.successfulQueries.toLocaleString()} successful`}
              />
              <StatCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Avg duration"
                value={stats.avgDurationMs < 1000 ? `${stats.avgDurationMs}ms` : `${(stats.avgDurationMs / 1000).toFixed(1)}s`}
                sub="successful queries only"
              />
              <StatCard
                icon={<Users className="h-3.5 w-3.5" />}
                label="Active users"
                value={stats.activeUsersLast30d.toLocaleString()}
                sub="last 30 days"
              />
              <StatCard
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Queries / day"
                value={stats.daily.length > 0
                  ? (stats.daily.reduce((s, d) => s + d.total, 0) / stats.daily.length).toFixed(1)
                  : "—"}
                sub="30-day average"
              />
            </div>

            {/* Daily activity */}
            {stats.daily.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                <p className="text-sm font-semibold text-white">Daily queries — last 30 days</p>
                <div className="flex items-end gap-1 h-20">
                  {stats.daily.map(({ date, total, success }) => {
                    const maxTotal = Math.max(...stats.daily.map((d) => d.total));
                    const heightPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                    const successPct = total > 0 ? (success / total) * 100 : 0;
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-0.5" title={`${date}: ${total} total, ${success} ok`}>
                        <div
                          className="w-full rounded-t-sm overflow-hidden"
                          style={{ height: `${heightPct}%`, minHeight: 2 }}
                        >
                          <div className="w-full bg-emerald-500/60" style={{ height: `${successPct}%` }} />
                          <div className="w-full bg-rose-500/40" style={{ height: `${100 - successPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500/60 inline-block" />Success</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500/40 inline-block" />Error</span>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Top questions */}
              {stats.topQuestions.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <p className="text-sm font-semibold text-white">Most common questions</p>
                  <div className="space-y-2">
                    {stats.topQuestions.map(({ question, count }) => (
                      <div key={question} className="flex items-start gap-2">
                        <span className="shrink-0 rounded-full bg-grape-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-grape-400 mt-0.5">
                          {count}×
                        </span>
                        <p className="text-xs text-slate-300 leading-snug">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error breakdown */}
              {stats.errorBreakdown.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <p className="text-sm font-semibold text-white">Query status breakdown</p>
                  <div className="space-y-1.5">
                    {stats.errorBreakdown
                      .sort((a, b) => b.count - a.count)
                      .map(({ status, count }) => {
                        const isSuccess = status === "report.generated";
                        return (
                          <div key={status} className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${isSuccess ? "bg-emerald-400" : "bg-rose-400/70"}`} />
                            <span className="text-xs text-slate-300 flex-1 truncate">{status}</span>
                            <span className="text-xs text-grape-400 tabular-nums">{count.toLocaleString()}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
