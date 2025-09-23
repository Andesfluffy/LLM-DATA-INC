"use client";
import { useEffect, useState } from "react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import ResultsTable from "@/src/components/ResultsTable";
import ResultsChart from "@/src/components/ResultsChart";
import CodeBlock from "@/src/components/CodeBlock";
import EmptyState from "@/src/components/EmptyState";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/src/components/ui/Toast";
import QueryInput from "@/src/components/QueryInput";
import RequireAuth from "@/src/components/RequireAuth";
import MosaicHero from "@/src/components/landing/MosaicHero";
import FeatureGrid from "@/src/components/landing/FeatureGrid";
import HowItWorks from "@/src/components/landing/HowItWorks";

type QueryResult = { sql: string; fields: string[]; rows: any[] };

export default function HomePage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasDs, setHasDs] = useState(false);
  const [view, setView] = useState<"table" | "chart">("table");

  useEffect(() => {
    const refresh = () => {
      try {
        const dsId = localStorage.getItem("datasourceId");
        setHasDs(!!dsId);
      } catch {
        setHasDs(false);
      }
    };

    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  async function onAsk(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt) return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const orgId = localStorage.getItem("orgId") || "demo-org";
      const datasourceId = localStorage.getItem("datasourceId");
      if (!datasourceId) { setError("Please configure a data source in Settings."); setBusy(false); return; }
      const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({ orgId, datasourceId, question: prompt }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d?.error || "Request failed"); toast.error(d?.error || "Request failed"); }
      else { setResult(d); toast.success("Query ran successfully"); }
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    if (!result?.rows?.length) return;
    const headers = result.fields;
    const esc = (v: any) => v==null?"":(/[",\n]/.test(String(v))? '"'+String(v).replace(/"/g,'""')+'"' : String(v));
    const lines = [headers.join(",")];
    for (const r of result.rows) lines.push(headers.map(h=>esc(r[h])).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <RequireAuth
      title="Sign in to explore Data Vista"
      description="Unlock AI-generated SQL, charts, and automations tailored to your workspace."
    >
      <div className="space-y-10">
        <MosaicHero />
        <FeatureGrid brandName="DataVista AI" />
        <HowItWorks brandName="DataVista AI" />
        <Card id="ask">
          <CardHeader
            title="Ask DataVista AI"
            subtitle={hasDs ? "Enter a question to generate and run SQL" : "No data source configured yet"}
          />
          <CardBody>
            {!hasDs && (
              <EmptyState
                title="No data source"
                examples={["Top 5 products by revenue", "Revenue by day last month", "Orders by region"]}
              />
            )}
            <QueryInput onSubmit={(q) => onAsk(q)} />
            {error && (
              <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Generated SQL" />
            <CardBody>
              {busy && !result?.sql ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : result?.sql ? (
                <CodeBlock code={result.sql} />
              ) : (
                <EmptyState
                  title="No SQL yet"
                  examples={["Sales last 30 days", "Top categories by revenue", "Active users by week"]}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Results" />
            <CardBody>
              {result?.rows && result.rows.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("table")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${view === "table" ? "border-accent text-accent bg-accent/10 shadow-sm" : "border-accent/40 text-slate-300 hover:border-accent/80 hover:text-accent"}`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("chart")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${view === "chart" ? "border-accent text-accent bg-accent/10 shadow-sm" : "border-accent/40 text-slate-300 hover:border-accent/80 hover:text-accent"}`}
                  >
                    Chart
                  </button>
                </div>
              )}
              {busy && !result?.rows ? (
                <TableSkeleton rows={6} cols={result?.fields?.length || 4} />
              ) : result?.rows && result.rows.length > 0 ? (
                view === "chart" ? (
                  <ResultsChart fields={result.fields} rows={result.rows} />
                ) : (
                  <ResultsTable fields={result.fields} rows={result.rows} />
                )
              ) : (
                <EmptyState title="No results" message="Run a query to see results here." />
              )}
              {result?.rows && result.rows.length > 0 && (
                <div className="mt-3">
                  <Button onClick={downloadCsv} variant="secondary">Download CSV</Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}


