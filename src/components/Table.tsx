"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortState = { field: string; dir: "asc" | "desc" } | null;

type Props = {
  fields: string[];
  rows: Record<string, any>[];
  className?: string;
  /** Max rows per page. 0 = no pagination */
  pageSize?: number;
};

export default function Table({ fields, rows, className = "", pageSize = 50 }: Props) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const toggleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev?.field === field) {
        return prev.dir === "asc" ? { field, dir: "desc" } : null;
      }
      return { field, dir: "asc" };
    });
    setPage(0);
  }, []);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { field, dir } = sort;
    return [...rows].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const na = Number(av);
      const nb = Number(bv);
      if (!isNaN(na) && !isNaN(nb)) return dir === "asc" ? na - nb : nb - na;
      const cmp = String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort]);

  const totalPages = pageSize > 0 ? Math.ceil(sortedRows.length / pageSize) : 1;
  const pagedRows = pageSize > 0 ? sortedRows.slice(page * pageSize, (page + 1) * pageSize) : sortedRows;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="overflow-x-auto border border-white/[0.06] rounded-xl bg-white/[0.01] backdrop-blur-md">
        <table className="min-w-full text-xs sm:text-sm" role="table">
          <thead className="sticky top-0">
            <tr>
              {fields.map((h) => {
                const isActive = sort?.field === h;
                return (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap text-left px-3 py-2.5 sm:px-4 sm:py-3 border-b border-white/[0.08] text-white bg-white/[0.05] font-semibold tracking-tight backdrop-blur-xl text-xs uppercase cursor-pointer select-none hover:bg-white/[0.08] transition-colors group"
                    onClick={() => toggleSort(h)}
                    aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {h}
                      <span className="text-grape-500 group-hover:text-grape-300 transition-colors">
                        {isActive ? (
                          sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r, i) => (
              <tr
                key={`row-${page * pageSize + i}-${fields.slice(0, 3).map((f) => String((r as any)[f] ?? "")).join("|")}`}
                className={`${i % 2 ? "bg-white/[0.03]" : "bg-transparent"} hover:bg-white/[0.06] transition-colors animate-fade-in`}
              >
                {fields.map((h) => (
                  <td
                    key={h}
                    className="max-w-[260px] px-3 py-2.5 sm:px-4 sm:py-3 align-top border-b border-white/[0.06] font-mono text-grape-100 break-words whitespace-pre-wrap"
                  >
                    {formatCell((r as any)[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-grape-400">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedRows.length)} of {sortedRows.length} rows
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(0)}
              className="px-2 py-1 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              First
            </button>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-2 text-grape-300">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
              className="px-2 py-1 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCell(v: any) {
  if (v === null || v === undefined) return <span className="text-grape-500 italic">null</span>;
  if (typeof v === "boolean") return <span className={v ? "text-emerald-400" : "text-rose-400"}>{String(v)}</span>;
  if (typeof v === "number") return <span className="tabular-nums">{v.toLocaleString()}</span>;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
