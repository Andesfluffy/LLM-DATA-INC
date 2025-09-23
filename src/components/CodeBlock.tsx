"use client";
import React, { useState } from "react";

export default function CodeBlock({ code }: { code: string }) {
  const [open, setOpen] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-accent/40">
      <div className="flex items-center justify-between border-b border-accent/20 bg-gray-50 px-3 py-2 dark:bg-gray-800/70">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-accent/60 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {open ? 'Hide SQL' : 'Show SQL'}
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-accent px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Copy
        </button>
      </div>
      {open && (
        <pre className="overflow-auto bg-white p-3 text-sm dark:bg-gray-900">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
