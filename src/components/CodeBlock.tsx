"use client";
import React, { useState } from "react";

export default function CodeBlock({ code }: { code: string }) {
  const [open, setOpen] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-grape-400 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          {open ? 'Hide SQL' : 'Show SQL'}
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-grape-400 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Copy
        </button>
      </div>
      {open && (
        <pre className="overflow-auto bg-black p-4 text-sm text-grape-200">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
