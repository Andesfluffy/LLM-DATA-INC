"use client";
import { useEffect, useRef, useState } from "react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import ResultsTable from "@/src/components/ResultsTable";
import ResultsChart from "@/src/components/ResultsChart";
import CodeBlock from "@/src/components/CodeBlock";
import EmptyState from "@/src/components/EmptyState";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import QueryInput from "@/src/components/QueryInput";
import MosaicHero from "@/src/components/landing/MosaicHero";
import FeatureGrid from "@/src/components/landing/FeatureGrid";
import HowItWorks from "@/src/components/landing/HowItWorks";

type QueryResult = { sql: string; fields: string[]; rows: any[] };

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasDs, setHasDs] = useState(false);
  const [view, setView] = useState<"table" | "chart">("table");

  useEffect(() => {
    const dsId = localStorage.getItem("datasourceId");
    setHasDs(!!dsId);
  }, []);

  async function onAsk() {
    setBusy(true); setError(null); setResult(null);
    try {
      const orgId = localStorage.getItem("orgId") || "demo-org";
      const datasourceId = localStorage.getItem("datasourceId");
      if (!datasourceId) { setError("Please configure a data source in Settings."); setBusy(false); return; }
      const { tryGetFirebaseClient } = await import("@/lib/firebase/client");
      const firebase = tryGetFirebaseClient();
      const idToken = firebase?.auth.currentUser ? await firebase.auth.currentUser.getIdToken() : undefined;
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({ orgId, datasourceId, question }),
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
    <div className="space-y-10">
  <MosaicHero />
  <FeatureGrid />
  <HowItWorks />
      <Card id="ask">
        <CardHeader title="Ask Data Vista" subtitle={hasDs ? "Enter a question to generate and run SQL" : "No data source configured yet"} />
        <CardBody>
          {!hasDs && <EmptyState title="No data source" examples={["Top 5 products by revenue","Revenue by day last month","Orders by region"]} />}
          <QueryInput onSubmit={(q)=>{ setQuestion(q); onAsk(); }} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <EmptyState title="No SQL yet" examples={["Sales last 30 days","Top categories by revenue","Active users by week"]} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Results" />
          <CardBody>
            {result?.rows && result.rows.length > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <Button variant={view === "table" ? "primary" : "secondary"} onClick={()=>setView("table")}>Table</Button>
                <Button variant={view === "chart" ? "primary" : "secondary"} onClick={()=>setView("chart")}>Chart</Button>
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
  );
}

function saveRecent(q: string){
  try{
    const arr = JSON.parse(localStorage.getItem("recentQueries") || "[]");
    const list: string[] = Array.isArray(arr)? arr: [];
    const next = [q, ...list.filter((x)=>x!==q)].slice(0,5);
    localStorage.setItem("recentQueries", JSON.stringify(next));
  }catch{}
}

function formatCell(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
