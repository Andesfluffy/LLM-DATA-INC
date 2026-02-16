"use client";

import { useCallback, useState } from "react";
import { ChevronDown, Database, Columns3 } from "lucide-react";
import type { ParsedTable } from "@/lib/schemaParser";

type SchemaPreviewProps = {
  tables: ParsedTable[];
};

export default function SchemaPreview({ tables }: SchemaPreviewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-grape-300">
        <Database className="h-3.5 w-3.5" />
        <span>
          Found <strong className="text-white">{tables.length}</strong>{" "}
          {tables.length === 1 ? "table" : "tables"} with{" "}
          <strong className="text-white">{totalColumns}</strong> columns
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
        {tables.map((table) => {
          const isOpen = expanded.has(table.name);
          return (
            <div key={table.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(table.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
              >
                <Columns3 className="h-3.5 w-3.5 text-white/[0.5] shrink-0" />
                <span className="text-xs font-medium text-white flex-1 truncate">{table.name}</span>
                <span className="text-[10px] text-grape-400">{table.columns.length} cols</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-grape-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-3 pb-2 pt-0.5 border-t border-white/[0.06]">
                  <div className="grid grid-cols-1 gap-0.5">
                    {table.columns.map((col) => (
                      <div key={col.name} className="flex items-center gap-2 py-0.5">
                        <span className="text-[11px] text-grape-200 truncate flex-1">{col.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            col.isNumeric
                              ? "bg-blue-500/10 text-blue-400"
                              : col.isTemporal
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-white/[0.04] text-grape-400"
                          }`}
                        >
                          {col.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
