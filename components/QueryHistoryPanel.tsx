"use client";

import { useCallback, useEffect, useState } from "react";
import { History, ChevronDown, ChevronRight, Clock, Database, RotateCcw } from "lucide-react";
import { getAuthHeaders } from "@/lib/uploadUtils";

type HistoryEntry = {
  id: string;
  nlQuery: string | null;
  executedSql: string | null;
  status: string;
  durationMs: number | null;
  rowCount: number | null;
  createdAt: string;
  dataSource: { id: string; name: string } | null;
};

type Props = {
  onRerun: (question: string) => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function QueryHistoryPanel({ onRerun }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedSql, setExpandedSql] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/history?limit=20", { headers });
      if (res.ok) {
        const data = await res.json() as { history: HistoryEntry[] };
        setHistory(data.history);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when panel is first opened
  useEffect(() => {
    if (open && history.length === 0) load();
  }, [open, history.length, load]);

  const successCount = history.filter((h) => h.status === "report.generated").length;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-grape-500/10 text-grape-400">
            <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Query history</p>
            <p className="text-xs text-grape-400 mt-0.5 truncate">
              {open
                ? `${history.length} recent queries · tap to collapse`
                : "Your last 20 queries · tap to expand"}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-grape-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 -rotate-90" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.04]">
          {loading ? (
            <div className="px-4 py-4 space-y-2 sm:px-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="px-4 py-6 text-center sm:px-5">
              <p className="text-sm text-grape-500">No queries yet — ask something above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {history.map((entry) => {
                const isExpanded = expandedSql === entry.id;
                const ok = entry.status === "report.generated";
                return (
                  <div key={entry.id} className="px-4 py-3 sm:px-5 space-y-1.5">
                    {/* Question row */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-snug truncate">{entry.nlQuery}</p>
                        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                          {/* Status pill */}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              ok
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {ok ? "Success" : "Failed"}
                          </span>
                          {/* Time */}
                          <span className="flex items-center gap-1 text-[11px] text-grape-500">
                            <Clock className="h-2.5 w-2.5" />
                            {timeAgo(entry.createdAt)}
                          </span>
                          {/* Duration */}
                          {entry.durationMs != null && (
                            <span className="text-[11px] text-grape-600">
                              {entry.durationMs < 1000
                                ? `${entry.durationMs}ms`
                                : `${(entry.durationMs / 1000).toFixed(1)}s`}
                            </span>
                          )}
                          {/* Row count */}
                          {entry.rowCount != null && ok && (
                            <span className="text-[11px] text-grape-600">{entry.rowCount} rows</span>
                          )}
                          {/* Data source */}
                          {entry.dataSource && (
                            <span className="flex items-center gap-1 text-[11px] text-grape-600">
                              <Database className="h-2.5 w-2.5" />
                              {entry.dataSource.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {entry.nlQuery && (
                          <button
                            type="button"
                            title="Re-run this question"
                            onClick={() => onRerun(entry.nlQuery!)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-grape-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                        {entry.executedSql && (
                          <button
                            type="button"
                            title="View SQL"
                            onClick={() => setExpandedSql(isExpanded ? null : entry.id)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-grape-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* SQL expand */}
                    {isExpanded && entry.executedSql && (
                      <pre className="rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5 text-[11px] text-slate-300 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-words">
                        {entry.executedSql}
                      </pre>
                    )}
                  </div>
                );
              })}

              {/* Refresh button */}
              <div className="px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="text-[11px] text-grape-500 hover:text-grape-300 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
