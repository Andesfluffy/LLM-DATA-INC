"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import { Loader2, Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";

type Report = {
  id: string;
  periodStart: string;
  periodEnd: string;
  summary: string | null;
  healthScore: number | null;
  markdownContent: string;
  jsonContent: any;
  generatedAt: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weeks, setWeeks] = useState(6);
  const [offset, setOffset] = useState(0);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadReports = useCallback(async (w = weeks, o = offset) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?weeks=${w}&offset=${o}`, { headers: await getAuth() });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error: any) {
      toast.error(error.message || "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [getAuth, weeks, offset]);

  useEffect(() => {
    loadReports(weeks, offset);
  }, [loadReports, weeks, offset]);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: await getAuth(),
        body: JSON.stringify({ offsetWeeks: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      toast.success("Report generated");
      await loadReports(weeks, offset);
    } catch (error: any) {
      toast.error(error.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [getAuth, loadReports, weeks, offset]);

  const download = useCallback((report: Report, format: "markdown" | "json") => {
    const content = format === "markdown" ? report.markdownContent : JSON.stringify(report.jsonContent, null, 2);
    const blob = new Blob([content], { type: format === "markdown" ? "text/markdown" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${report.periodStart.slice(0, 10)}.${format === "markdown" ? "md" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const offsetLabel = useMemo(() => {
    if (offset === 0) return "Current window";
    return `History offset: ${offset}`;
  }, [offset]);

  return (
    <RequireAuth title="Sign in to view reports" description="Weekly report history is organization-scoped.">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Weekly Business Reports" subtitle="Health score, trend deltas, product movers, expense shifts, and recommendations." />
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Generate latest
              </Button>
              <label className="text-xs text-grape-300">Last N weeks:</label>
              <select
                value={weeks}
                onChange={(e) => { setWeeks(Number(e.target.value)); setOffset(0); }}
                className="rounded-lg border border-white/[0.1] bg-black px-2 py-1 text-sm"
              >
                {[4, 6, 8, 12].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <Button variant="secondary" onClick={() => setOffset((x) => Math.max(0, x - weeks))} disabled={offset === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => setOffset((x) => x + weeks)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-grape-400">{offsetLabel}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Report history" subtitle="Download markdown or JSON snapshots for any week." />
          <CardBody>
            {loading ? (
              <div className="py-10 text-sm text-grape-300 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading reports...</div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-grape-300">No reports yet. Generate your first weekly report.</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">
                        {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()} • Health {report.healthScore ?? "n/a"}/100
                      </p>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => download(report, "markdown")}><Download className="h-4 w-4 mr-1" />Markdown</Button>
                        <Button variant="secondary" onClick={() => download(report, "json")}><Download className="h-4 w-4 mr-1" />JSON</Button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-grape-200">{report.summary || "No summary generated."}</p>
                    <pre className="mt-3 max-h-52 overflow-auto rounded-lg bg-black/50 p-3 text-xs text-grape-200 whitespace-pre-wrap">{report.markdownContent}</pre>
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
