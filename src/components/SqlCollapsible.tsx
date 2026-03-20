"use client";

import { useState } from "react";
import { Code2 } from "lucide-react";
import CodeBlock from "@/src/components/CodeBlock";

type SqlCollapsibleProps = {
  sql: string | undefined;
  busy: boolean;
};

export default function SqlCollapsible({ sql, busy }: SqlCollapsibleProps) {
  const [showSql, setShowSql] = useState(false);

  if (!sql && !busy) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] no-print">
      <button
        type="button"
        onClick={() => setShowSql(!showSql)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
      >
        <div className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.04] text-grape-300">
          <Code2 className="h-3 w-3" />
        </div>
        <p className="text-xs font-medium text-grape-300 flex-1">
          {showSql ? "Hide" : "Show"} query (advanced)
        </p>
        <svg
          className={`h-4 w-4 text-grape-300 transition-transform ${showSql ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showSql && sql && (
        <div className="px-4 pb-4">
          <CodeBlock code={sql} />
        </div>
      )}
    </div>
  );
}
