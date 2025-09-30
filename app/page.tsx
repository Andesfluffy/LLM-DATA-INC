"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import Button from "@/src/components/Button";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import CodeBlock from "@/src/components/CodeBlock";
import EmptyState from "@/src/components/EmptyState";
import FeatureGrid from "@/src/components/landing/FeatureGrid";
import HowItWorks from "@/src/components/landing/HowItWorks";
import MosaicHero from "@/src/components/landing/MosaicHero";
import QueryInput from "@/src/components/QueryInput";
import RequireAuth from "@/src/components/RequireAuth";
import ResultsChart from "@/src/components/ResultsChart";
import ResultsTable from "@/src/components/ResultsTable";
import { toast } from "@/src/components/ui/Toast";
import { fetchAccessibleDataSources } from "@/src/lib/datasourceClient";

type QueryResult = {
  sql: string;
  fields: string[];
  rows: Record<string, unknown>[];
};

type ConnectionIds = {
  orgId: string;
  datasourceId: string;
};

export default function HomePage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasDatasource, setHasDatasource] = useState(false);
  const [view, setView] = useState<"table" | "chart">("table");

  const syncFromLocalStorage = useCallback(() => {
    try {
      const datasourceId = localStorage.getItem("datasourceId");
      const orgId = localStorage.getItem("orgId");
      setHasDatasource(Boolean(datasourceId && orgId));
    } catch {
      setHasDatasource(false);
    }
  }, []);

  const resolveConnectionIds = useCallback(async (): Promise<ConnectionIds | null> => {
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
      console.error("Failed to resolve data source ids", err);
    }

    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        await resolveConnectionIds();
      } finally {
        if (!cancelled) {
          syncFromLocalStorage();
        }
      }
    };

    syncFromLocalStorage();
    hydrate();

    const onFocus = () => syncFromLocalStorage();
    const onStorage = () => syncFromLocalStorage();

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [resolveConnectionIds, syncFromLocalStorage]);

  const onAsk = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt) return;

      setBusy(true);
      setError(null);
      setResult(null);

      try {
        const ids = await resolveConnectionIds();
        if (!ids) {
          const message = "Please configure a data source in Settings.";
          setError(message);
          toast.error(message);
          return;
        }

        const { orgId, datasourceId } = ids;
        const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
        const response = await fetch("/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ orgId, datasourceId, question: prompt }),
        });

        const payload = await response.json();
        if (!response.ok) {
          const message = payload?.error || "Request failed";
          throw new Error(message);
        }

        setResult(payload);
        toast.success("Query ran successfully");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [resolveConnectionIds],
  );

  const downloadCsv = useCallback(() => {
    if (!result?.rows?.length) return;

    const headers = result.fields;
    const escapeCell = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      return /[",\n]/.test(stringValue)
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    };

    const lines = [headers.join(",")];
    for (const row of result.rows) {
      lines.push(headers.map((field) => escapeCell((row as Record<string, unknown>)[field])).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const hasRows = useMemo(() => Boolean(result?.rows && result.rows.length > 0), [result]);

  const handleViewChange = useCallback((next: "table" | "chart") => {
    setView(next);
  }, []);

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
            subtitle={hasDatasource ? "Enter a question to generate and run SQL" : "No data source configured yet"}
          />
          <CardBody>
            {!hasDatasource && (
              <EmptyState
                title="No data source"
                examples={["Top 5 products by revenue", "Revenue by day last month", "Orders by region"]}
              />
            )}
            <QueryInput onSubmit={onAsk} />
            {error && (
              <p role="alert" className="mt-3 text-sm text-rose-400" aria-live="polite">
                {error}
              </p>
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
              {hasRows && (
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewChange("table")}
                    aria-pressed={view === "table"}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      view === "table"
                        ? "border-accent bg-accent/10 text-accent shadow-sm"
                        : "border-accent/40 text-slate-300 hover:border-accent/80 hover:text-accent"
                    }`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewChange("chart")}
                    aria-pressed={view === "chart"}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      view === "chart"
                        ? "border-accent bg-accent/10 text-accent shadow-sm"
                        : "border-accent/40 text-slate-300 hover:border-accent/80 hover:text-accent"
                    }`}
                  >
                    Chart
                  </button>
                </div>
              )}
              {busy && !result?.rows ? (
                <TableSkeleton rows={6} cols={result?.fields?.length || 4} />
              ) : hasRows && result ? (
                view === "chart" ? (
                  <ResultsChart fields={result.fields} rows={result.rows} />
                ) : (
                  <ResultsTable fields={result.fields} rows={result.rows} />
                )
              ) : (
                <EmptyState title="No results" message="Run a query to see results here." />
              )}
              {hasRows && (
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
