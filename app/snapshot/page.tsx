"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";

type KpiMetrics = {
  revenue: number;
  expense: number;
  refund: number;
  margin: number;
};

type Snapshot = {
  id: string;
  windowStart: string;
  windowEnd: string;
  metrics: KpiMetrics;
  createdAt: string;
};

type Report = {
  id: string;
  healthScore: number | null;
  summary: string | null;
  periodStart: string;
  periodEnd: string;
  jsonContent: any;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function pctChange(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? "text-emerald-400" : score >= 45 ? "text-yellow-400" : "text-red-400";
  const bg = score >= 70 ? "bg-emerald-400/10" : score >= 45 ? "bg-yellow-400/10" : "bg-red-400/10";
  const border = score >= 70 ? "border-emerald-400/30" : score >= 45 ? "border-yellow-400/30" : "border-red-400/30";
  const label = score >= 70 ? "Healthy" : score >= 45 ? "Attention Needed" : "Critical";
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border ${border} ${bg} p-6`}>
      <span className={`text-5xl font-bold ${color}`}>{score}</span>
      <span className="mt-1 text-xs text-grape-300">/ 100</span>
      <span className={`mt-2 text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

function KpiCard({ label, value, prevValue, icon: Icon, format = "currency" }: {
  label: string;
  value: number;
  prevValue: number;
  icon: any;
  format?: "currency" | "percent";
}) {
  const change = pctChange(value, prevValue);
  const isUp = change > 0;
  const isGoodUp = label !== "Expenses" && label !== "Refunds";
  const isPositive = isGoodUp ? isUp : !isUp;
  const changeColor = isPositive ? "text-emerald-400" : "text-red-400";
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const displayValue = format === "currency" ? formatCurrency(value) : `${value.toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-grape-300">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{displayValue}</p>
      <div className={`mt-1 flex items-center gap-1 text-xs ${changeColor}`}>
        <TrendIcon className="h-3 w-3" />
        <span>{Math.abs(change).toFixed(1)}% vs prior week</span>
      </div>
    </div>
  );
}

export default function SnapshotPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuth();
      const [snapRes, reportRes] = await Promise.all([
        fetch("/api/monitor/snapshots?limit=4", { headers }),
        fetch("/api/reports?weeks=1&offset=0", { headers }),
      ]);
      if (snapRes.ok) {
        const snapData = await snapRes.json();
        setSnapshots(snapData.snapshots || []);
      }
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReport(reportData.reports?.[0] || null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load snapshot data");
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => { loadData(); }, [loadData]);

  const triggerMonitor = useCallback(async () => {
    setGenerating(true);
    try {
      const headers = await getAuth();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers,
        body: JSON.stringify({ offsetWeeks: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate snapshot");
      toast.success("Snapshot refreshed");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to refresh");
    } finally {
      setGenerating(false);
    }
  }, [getAuth, loadData]);

  // Pair snapshots: current + previous
  const current = snapshots[0]?.metrics || { revenue: 0, expense: 0, refund: 0, margin: 0 };
  const previous = snapshots[1]?.metrics || { revenue: 0, expense: 0, refund: 0, margin: 0 };
  const healthScore = report?.healthScore ?? 0;
  const marginPct = current.revenue > 0 ? (current.margin / current.revenue) * 100 : 0;
  const prevMarginPct = previous.revenue > 0 ? (previous.margin / previous.revenue) * 100 : 0;

  return (
    <RequireAuth title="Sign in to view business snapshot" description="Business health overview for your organization.">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Business Snapshot" subtitle="Real-time KPI overview with health score and week-over-week trends." />
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={triggerMonitor} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh Snapshot
              </Button>
              {report && (
                <span className="text-xs text-grape-400">
                  Last report: {new Date(report.periodStart).toLocaleDateString()} — {new Date(report.periodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-grape-300">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading snapshot...
          </div>
        ) : snapshots.length === 0 && !report ? (
          <Card>
            <CardBody>
              <div className="py-10 text-center">
                <BarChart3 className="mx-auto h-10 w-10 text-grape-400 mb-3" />
                <p className="text-sm text-grape-300">No snapshot data yet.</p>
                <p className="text-xs text-grape-400 mt-1">Connect a data source and run the monitoring engine to generate your first snapshot.</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Health Score */}
            <div className="grid gap-4 md:grid-cols-3">
              <HealthGauge score={healthScore} />
              <div className="md:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                <h3 className="text-sm font-medium text-grape-200 mb-2">AI Summary</h3>
                <p className="text-sm text-grape-300 leading-relaxed">
                  {report?.summary || "No AI summary available. Generate a report to see insights."}
                </p>
                {report?.jsonContent?.recommendations && (
                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-grape-200 mb-1">Recommended Actions</h4>
                    <ul className="space-y-1">
                      {report.jsonContent.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-xs text-grape-300 flex gap-2">
                          <span className="text-grape-400">•</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Revenue" value={current.revenue} prevValue={previous.revenue} icon={DollarSign} />
              <KpiCard label="Margin" value={marginPct} prevValue={prevMarginPct} icon={TrendingUp} format="percent" />
              <KpiCard label="Expenses" value={current.expense} prevValue={previous.expense} icon={BarChart3} />
              <KpiCard label="Refunds" value={current.refund} prevValue={previous.refund} icon={AlertTriangle} />
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
