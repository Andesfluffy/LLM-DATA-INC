"use client";
import { useEffect, useState } from "react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";
import Button from "@/src/components/Button";
import Table from "@/src/components/Table";
import Chart from "@/src/components/Chart";
import { useActiveDataSource } from "@/src/hooks/useActiveDataSource";

type Row = Record<string, any>;

export default function QueryClient({ canRun }: { canRun: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [sql, setSql] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busyGen, setBusyGen] = useState(false);
  const [busyRun, setBusyRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "chart">("table");
  const { data: active, refresh: refreshActive } = useActiveDataSource();
  const datasourceId = active?.datasource?.id || null;

  useEffect(() => {
    const handler = () => {
      refreshActive();
    };
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("focus", handler);
    };
  }, [refreshActive]);

  async function generate() {
    setBusyGen(true); setError(null); setRows(null);
    if (!datasourceId) { setBusyGen(false); setError("Please save a data source in Settings."); return; }
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    const res = await fetch("/api/nl2sql", { method: "POST", headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify({ datasourceId, prompt }) });
    setBusyGen(false);
    if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setSql(data.sql);
  }

  async function run() {
    setBusyRun(true); setError(null); setRows(null);
    if (!datasourceId) { setBusyRun(false); setError("Please save a data source in Settings."); return; }
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    const res = await fetch("/api/execute", { method: "POST", headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify({ datasourceId, sql }) });
    setBusyRun(false);
    if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    setRows(data.rows);
  }

  async function exportCsv() {
    if (!datasourceId) { setError("Please save a data source in Settings."); return; }
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    const res = await fetch("/api/export.csv", { method: "POST", headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify({ datasourceId, sql }) });
    if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Ask a question" subtitle="Generate SQL from natural language" />
        <CardBody>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Question</label>
            <textarea className="border rounded-md w-full px-3 py-2" rows={3} value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="e.g. Top 10 customers by revenue last quarter" />
            <div className="mt-2 flex gap-2">
              <Button onClick={generate} disabled={!canRun || busyGen || !prompt.trim() || !datasourceId}>{busyGen?"Generating…":"Generate SQL"}</Button>
            </div>
          </div>
          {error && <div className="mt-3"><ErrorAlert message={error} /></div>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="SQL" />
        <CardBody>
          <textarea className="border rounded-md w-full px-3 py-2 font-mono" rows={8} value={sql} onChange={(e)=>setSql(e.target.value)} placeholder="SELECT ..." />
          <div className="mt-2 flex gap-2">
            <Button onClick={run} disabled={!canRun || busyRun || !sql.trim() || !datasourceId}>{busyRun?"Running…":"Run"}</Button>
            <Button onClick={exportCsv} disabled={!canRun || busyRun || !sql.trim() || !datasourceId} variant="secondary">Export CSV</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Results" />
        <CardBody>
          {rows && rows.length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <Button variant={view === "table" ? "primary" : "secondary"} onClick={()=>setView("table")}>Table</Button>
              <Button variant={view === "chart" ? "primary" : "secondary"} onClick={()=>setView("chart")}>Chart</Button>
            </div>
          )}
          {!rows ? (
            <EmptyState title="No rows yet" message="Run a query to see results." />
          ) : rows.length === 0 ? (
            <EmptyState title="Empty" message="The query returned no rows." />
            ) : (
              view === "chart" ? (
              <Chart fields={Object.keys(rows?.[0] || {})} rows={rows} />
            ) : (
              <Table fields={Object.keys(rows?.[0] || {})} rows={rows} />
            )
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function formatCell(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
