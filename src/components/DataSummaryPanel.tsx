"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Sparkles, X, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import Card, { CardBody } from "@/src/components/Card";
import { getAuthHeaders } from "@/lib/uploadUtils";

type SummaryData = {
  description: string;
  suggestions: string[];
  tableCount?: number;
  tables?: string[];
};

type Props = {
  datasourceId: string;
  datasourceName?: string;
  onAsk: (question: string) => void;
  onDismiss: () => void;
};

export default function DataSummaryPanel({ datasourceId, datasourceName, onAsk, onDismiss }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();

        // Fetch AI suggestions + schema info in parallel
        const [suggestRes, schemaRes] = await Promise.all([
          fetch("/api/datasources/suggest", {
            method: "POST",
            headers,
            body: JSON.stringify({ datasourceId }),
          }),
          fetch(`/api/datasources/schema-info?datasourceId=${datasourceId}`, { headers }),
        ]);

        if (!suggestRes.ok) throw new Error("Failed to load data summary");

        const suggest = await suggestRes.json() as { description?: string; suggestions?: string[] };
        let tableCount: number | undefined;
        let tables: string[] | undefined;

        if (schemaRes.ok) {
          const schema = await schemaRes.json() as { tables?: { name: string }[] };
          tableCount = schema.tables?.length;
          tables = schema.tables?.slice(0, 5).map((t) => t.name);
        }

        if (!cancelled) {
          setData({
            description: suggest.description || "Your data source is connected and ready to query.",
            suggestions: Array.isArray(suggest.suggestions) ? suggest.suggestions.slice(0, 5) : [],
            tableCount,
            tables,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load summary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [datasourceId]);

  const handleSuggestionClick = useCallback(
    (question: string) => {
      onDismiss();
      onAsk(question);
    },
    [onAsk, onDismiss],
  );

  return (
    <Card>
      <CardBody>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {datasourceName ? `"${datasourceName}" connected` : "Data source connected"}
              </p>
              <p className="text-xs text-grape-400 mt-0.5">Here's what your data contains</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-grape-500 hover:text-grape-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
              <span>Analyzing your data and generating insights…</span>
            </div>
            <div className="space-y-2 pl-6">
              <div className="h-3 w-3/4 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : data ? (
          <div className="space-y-4">
            {/* Stats row */}
            {(data.tableCount !== undefined || data.tables?.length) && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-grape-300">
                  <Database className="h-3.5 w-3.5 text-grape-400" />
                  {data.tableCount !== undefined
                    ? `${data.tableCount} table${data.tableCount === 1 ? "" : "s"}`
                    : `${data.tables?.length} table${(data.tables?.length ?? 0) === 1 ? "" : "s"}`}
                </div>
                {data.tables?.map((t) => (
                  <span key={t} className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-2 py-1 text-xs text-grape-500">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* AI Description */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-xs font-medium text-amber-300 uppercase tracking-wide">AI Summary</p>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{data.description}</p>
            </div>

            {/* Suggested questions */}
            {data.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-grape-400 mb-2 uppercase tracking-wide">
                  Try asking
                </p>
                <div className="space-y-1.5">
                  {data.suggestions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSuggestionClick(q)}
                      className="group w-full flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-xs text-grape-300 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white transition-all"
                    >
                      <ArrowRight className="h-3 w-3 text-grape-500 group-hover:text-grape-300 shrink-0 transition-colors" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
