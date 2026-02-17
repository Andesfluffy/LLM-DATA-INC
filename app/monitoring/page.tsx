"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import { Loader2, Activity, CheckCircle2, XCircle, AlertTriangle, Info, Clock, Settings } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";
import Link from "next/link";

type Finding = {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description?: string;
  currentValue?: number;
  previousValue?: number;
  changeRatio?: number;
  createdAt: string;
};

type Run = {
  id: string;
  dataSourceId: string;
  status: string;
  trigger: string;
  windowStart: string;
  windowEnd: string;
  schemaRefreshed: boolean;
  error?: string;
  completedAt?: string;
  createdAt: string;
  findings: Finding[];
};

const severityStyle: Record<string, string> = {
  critical: "border-red-400/30 bg-red-400/10 text-red-400",
  warning: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  info: "border-blue-400/30 bg-blue-400/10 text-blue-400",
};

const severityIcon: Record<string, any> = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function MonitoringPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/runs?limit=20", { headers: await getAuth() });
      if (!res.ok) throw new Error("Failed to fetch monitor runs");
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (error: any) {
      toast.error(error.message || "Could not load monitoring data");
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const allFindings = runs.flatMap((r) => r.findings);
  const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
  const warningCount = allFindings.filter((f) => f.severity === "warning").length;
  const lastRun = runs[0];

  return (
    <RequireAuth title="Sign in to view monitoring" description="Automated business monitoring dashboard.">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Monitoring Dashboard" subtitle="Automated revenue, expense, refund, and margin tracking with anomaly detection." />
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/settings/monitoring">
                <Button variant="secondary">
                  <Settings className="h-4 w-4 mr-2" /> Configure Schedule
                </Button>
              </Link>
              <Link href="/settings/alerts">
                <Button variant="secondary">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Manage Alert Rules
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* Status Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-grape-300">
              <Activity className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Total Runs</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{runs.length}</p>
          </div>
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Critical Findings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-400">{criticalCount}</p>
          </div>
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Warnings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-yellow-400">{warningCount}</p>
          </div>
        </div>

        {/* Run History */}
        <Card>
          <CardHeader title="Monitor Run History" subtitle="Each run analyzes your data sources for week-over-week anomalies." />
          <CardBody>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-grape-300">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading runs...
              </div>
            ) : runs.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="mx-auto h-10 w-10 text-grape-400 mb-3" />
                <p className="text-sm text-grape-300">No monitor runs yet.</p>
                <p className="text-xs text-grape-400 mt-1">
                  Configure a monitoring schedule in{" "}
                  <Link href="/settings/monitoring" className="text-grape-200 underline">settings</Link>
                  {" "}to start automated monitoring.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {runs.map((run) => (
                  <div key={run.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {run.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : run.status === "failed" ? (
                          <XCircle className="h-4 w-4 text-red-400" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-grape-300" />
                        )}
                        <span className="text-sm font-medium text-white">
                          {new Date(run.windowStart).toLocaleDateString()} — {new Date(run.windowEnd).toLocaleDateString()}
                        </span>
                        <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] text-grape-300">
                          {run.trigger}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-grape-400">
                        <Clock className="h-3 w-3" />
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {run.error && (
                      <p className="mt-2 text-xs text-red-400">{run.error}</p>
                    )}

                    {run.findings.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {run.findings.map((finding) => {
                          const Icon = severityIcon[finding.severity] || Info;
                          return (
                            <div
                              key={finding.id}
                              className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${severityStyle[finding.severity] || severityStyle.info}`}
                            >
                              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-medium">{finding.title}</p>
                                {finding.description && <p className="mt-0.5 opacity-80">{finding.description}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {run.findings.length === 0 && run.status === "completed" && (
                      <p className="mt-2 text-xs text-emerald-400">No anomalies detected for this period.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireAuth>
  );
}
