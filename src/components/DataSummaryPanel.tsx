"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Sparkles, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
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
};

const SESSION_KEY = "data-summary-collapsed";

export default function DataSummaryPanel({ datasourceId, datasourceName, onAsk }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { sessionStorage.setItem(SESSION_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
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
          tables = schema.tables?.slice(0, 6).map((t) => t.name);
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

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {datasourceName ? datasourceName : "Connected data"}
            </p>
            <p className="text-xs text-grape-400 mt-0.5 truncate">
              {loading
                ? "Analyzing your data…"
                : collapsed
                ? data?.description
                  ? data.description.slice(0, 55) + (data.description.length > 55 ? "…" : "")
                  : "AI summary ready — tap to expand"
                : data?.tableCount !== undefined
                ? `${data.tableCount} ${data.tableCount === 1 ? "table" : "tables"} · tap to collapse`
                : "AI overview · tap to collapse"}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-grape-500">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded body */}
      {!collapsed && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-4 border-t border-white/[0.04]">
          {loading ? (
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                <span>Analyzing your data…</span>
              </div>
              <div className="space-y-2 pl-6">
                <div className="h-3 w-3/4 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-rose-300 pt-3">{error}</p>
          ) : data ? (
            <>
              {/* Table badges */}
              {data.tables && data.tables.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {data.tables.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-grape-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* AI summary */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 sm:px-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">AI Summary</p>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{data.description}</p>
              </div>

              {/* Suggested questions */}
              {data.suggestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-grape-500 mb-2 uppercase tracking-wider">
                    Try asking
                  </p>
                  <div className="space-y-1.5">
                    {/* Mobile: first 3 only. sm+: all 5 */}
                    {data.suggestions.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onAsk(q)}
                        className={`group w-full flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-xs text-grape-300 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white transition-all ${
                          i >= 3 ? "hidden sm:flex" : "flex"
                        }`}
                      >
                        <ArrowRight className="h-3 w-3 text-grape-500 group-hover:text-grape-300 shrink-0 mt-0.5 transition-colors" />
                        <span className="leading-snug">{q}</span>
                      </button>
                    ))}
                    {data.suggestions.length > 3 && (
                      <p className="text-[11px] text-grape-600 pl-1 sm:hidden">
                        +{data.suggestions.length - 3} more suggestions on larger screens
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
