"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, RotateCcw, Trash2, ChevronDown } from "lucide-react";
import { getSavedQueries, removeSavedQuery, type SavedQuery } from "@/lib/savedQueries";

type Props = {
  onRerun: (question: string) => void;
  /** Increment this to force a re-render after a query is saved outside this component */
  refreshKey?: number;
};

export default function SavedQueriesPanel({ onRerun, refreshKey }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedQuery[]>([]);

  const reload = useCallback(() => setItems(getSavedQueries()), []);

  // Reload when opened or when refreshKey changes (new save from parent)
  useEffect(() => { reload(); }, [open, refreshKey, reload]);

  const handleRemove = useCallback((id: string) => {
    removeSavedQuery(id);
    reload();
  }, [reload]);

  if (items.length === 0 && !open) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Saved queries</p>
            <p className="text-xs text-grape-400 mt-0.5 truncate">
              {open ? `${items.length} saved · tap to collapse` : `${items.length} saved question${items.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-grape-500">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.04]">
          {items.length === 0 ? (
            <div className="px-4 py-5 text-center sm:px-5">
              <p className="text-sm text-grape-500">
                No saved queries yet — star a question from the results to save it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-2 px-4 py-3 sm:px-5">
                  <p className="flex-1 min-w-0 text-sm text-white leading-snug">{item.question}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Re-run"
                      onClick={() => onRerun(item.question)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-grape-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() => handleRemove(item.id)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-grape-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
