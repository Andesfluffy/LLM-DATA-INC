"use client";

import { useCallback, useMemo, useState } from "react";

import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Chart from "@/src/components/Chart";
import EmptyState from "@/components/ui/empty-state";
import ErrorAlert from "@/components/ui/error-alert";
import Table from "@/src/components/Table";
import Textarea from "@/src/components/ui/Textarea";
import { TableSkeleton } from "@/components/ui/skeleton";
import { fetchAccessibleDataSources } from "@/src/lib/datasourceClient";

const VIEW_OPTIONS = ["table", "chart"] as const;
type ViewOption = (typeof VIEW_OPTIONS)[number];

type QueryClientProps = {
  canRun: boolean;
};

type Row = Record<string, unknown>;
type ConnectionIds = {
  orgId: string;
  datasourceId: string;
};

type QueryResponse = {
  rows: Row[];
};

type SqlResponse = {
  sql: string;
};

export default function QueryClient({ canRun }: QueryClientProps) {
  const [prompt, setPrompt] = useState("");
  const [sql, setSql] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [view, setView] = useState<ViewOption>("table");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const ensureConnectionIds = useCallback(async (): Promise<ConnectionIds | null> => {
    try {
      let orgId = localStorage.getItem("orgId");
      let datasourceId = localStorage.getItem("datasourceId");

      if (orgId && datasourceId) {
        return { orgId, datasourceId };
      }

      const list = await fetchAccessibleDataSources();
      if (list.length > 0) {
        const first = list[0]!;
        datasourceId = first.id;
        orgId = first.orgId || null;

        localStorage.setItem("datasourceId", datasourceId);
        if (first.orgId) {
          localStorage.setItem("orgId", first.orgId);
        }
      }

      if (orgId && datasourceId) {
        return { orgId, datasourceId };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }

    setError("Please save a data source in Settings.");
    return null;
  }, []);

  const fetchWithAuth = useCallback(async (endpoint: string, payload: Record<string, unknown>) => {
    const ids = await ensureConnectionIds();
    if (!ids) {
      return null;
    }

    const { orgId, datasourceId } = ids;
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ ...payload, orgId, datasourceId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = data?.error || "Request failed";
      throw new Error(message);
    }

    return response;
  }, [ensureConnectionIds]);

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setIsGenerating(true);
    setError(null);
    setRows(null);

    try {
      const response = await fetchWithAuth("/api/nl2sql", { prompt: trimmed });
      if (!response) return;

      const data = (await response.json()) as SqlResponse;
      setSql(data.sql);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }, [fetchWithAuth, prompt]);

  const handleRun = useCallback(async () => {
    const trimmed = sql.trim();
    if (!trimmed) return;

    setIsRunning(true);
    setError(null);
    setRows(null);

    try {
      const response = await fetchWithAuth("/api/execute", { sql: trimmed });
      if (!response) return;

      const data = (await response.json()) as QueryResponse;
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [fetchWithAuth, sql]);

  const handleExport = useCallback(async () => {
    const trimmed = sql.trim();
    if (!trimmed) return;

    try {
      const response = await fetchWithAuth("/api/export.csv", { sql: trimmed });
      if (!response) return;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "export.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [fetchWithAuth, sql]);

  const hasRows = useMemo(() => Boolean(rows && rows.length > 0), [rows]);
  const fields = useMemo(() => (rows && rows[0] ? Object.keys(rows[0]) : []), [rows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Ask a question" subtitle="Generate SQL from natural language" />
        <CardBody className="space-y-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300" htmlFor="query-prompt">
              Question
            </label>
            <Textarea
              id="query-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder="e.g. Top 10 customers by revenue last quarter"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={!canRun || isGenerating || !prompt.trim()}>
                {isGenerating ? "Generating…" : "Generate SQL"}
              </Button>
            </div>
          </div>
          {error && (
            <ErrorAlert message={error} className="mt-2" aria-live="polite" />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="SQL" />
        <CardBody className="space-y-3">
          <Textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            rows={8}
            placeholder="SELECT …"
            aria-label="Generated SQL"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRun} disabled={!canRun || isRunning || !sql.trim()}>
              {isRunning ? "Running…" : "Run"}
            </Button>
            <Button onClick={handleExport} disabled={!canRun || isRunning || !sql.trim()} variant="secondary">
              Export CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Results" />
        <CardBody className="space-y-4">
          {hasRows && (
            <div className="flex items-center gap-2">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  aria-pressed={view === option}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                    view === option
                      ? "border-accent bg-accent/10 text-accent shadow-sm"
                      : "border-accent/40 text-slate-300 hover:border-accent/80 hover:text-accent"
                  }`}
                >
                  {option === "table" ? "Table" : "Chart"}
                </button>
              ))}
            </div>
          )}

          {isRunning && !rows ? (
            <TableSkeleton rows={6} cols={fields.length || 4} />
          ) : hasRows && rows ? (
            view === "chart" ? (
              <Chart fields={fields} rows={rows} />
            ) : (
              <Table fields={fields} rows={rows} />
            )
          ) : (
            <EmptyState title="No rows yet" message="Run a query to see results." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
