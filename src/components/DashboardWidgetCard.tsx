"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, Table2, BarChart3 } from "lucide-react";
import Card, { CardBody } from "@/src/components/Card";
import ResultsTable from "@/src/components/ResultsTable";
import ResultsChart from "@/src/components/ResultsChart";

type WidgetData = {
  id: string;
  displayType: string;
  savedQuery: {
    id: string;
    question: string;
    sql: string | null;
    name: string | null;
  };
};

type QueryResult = {
  fields: string[];
  rows: Record<string, unknown>[];
};

type DashboardWidgetCardProps = {
  widget: WidgetData;
  onRemove: (widgetId: string) => void;
};

export default function DashboardWidgetCard({ widget, onRemove }: DashboardWidgetCardProps) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"table" | "chart">(
    (widget.displayType as "table" | "chart") || "table"
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!widget.savedQuery.sql) {
        setError("No SQL query saved");
        setLoading(false);
        return;
      }

      try {
        const orgId = localStorage.getItem("orgId");
        const datasourceId = localStorage.getItem("datasourceId");
        if (!orgId || !datasourceId) {
          setError("No data source configured");
          setLoading(false);
          return;
        }

        const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ orgId, datasourceId, sql: widget.savedQuery.sql }),
        });

        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            const rows = Array.isArray(data.rows) ? data.rows : [];
            const fields = Array.isArray(data.fields)
              ? data.fields
              : rows[0]
                ? Object.keys(rows[0] as Record<string, unknown>)
                : [];
            setResult({ fields, rows });
          } else {
            const data = await res.json().catch(() => ({}));
            setError(data.error || "Query failed");
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [widget.savedQuery.sql]);

  const hasRows = result && result.rows.length > 0;
  const title = widget.savedQuery.name || widget.savedQuery.question;

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm font-medium text-white truncate flex-1" title={title}>
            {title}
          </p>
          <div className="flex items-center gap-1 self-end shrink-0 sm:self-auto">
            {hasRows && (
              <>
                <button
                  type="button"
                  onClick={() => setViewType("table")}
                  className={`p-1 rounded transition ${viewType === "table" ? "text-white" : "text-grape-400 hover:text-white"}`}
                >
                  <Table2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewType("chart")}
                  className={`p-1 rounded transition ${viewType === "chart" ? "text-white" : "text-grape-400 hover:text-white"}`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onRemove(widget.id)}
              className="p-1 rounded text-grape-500 hover:text-red-400 transition ml-1"
              title="Remove from dashboard"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-grape-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <p className="text-xs text-red-400 py-4 text-center">{error}</p>
        ) : hasRows ? (
          <div className="max-h-64 overflow-auto">
            {viewType === "chart" ? (
              <ResultsChart fields={result.fields} rows={result.rows} />
            ) : (
              <ResultsTable fields={result.fields} rows={result.rows} />
            )}
          </div>
        ) : (
          <p className="text-xs text-grape-400 py-4 text-center">No results returned</p>
        )}

        {hasRows && (
          <p className="text-[10px] text-grape-500 mt-2">
            {result.rows.length} {result.rows.length === 1 ? "row" : "rows"}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
