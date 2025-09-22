"use client";
import React, { useState } from "react";

export default function CodeBlock({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  function copy(){ navigator.clipboard.writeText(code); }
  return (
    <div className="border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
        <button onClick={()=>setOpen(o=>!o)} className="text-sm text-gray-700 dark:text-gray-200">{open? 'Hide SQL' : 'Show SQL'}</button>
        <button onClick={copy} className="text-xs px-2 py-1 border rounded-md">Copy</button>
      </div>
      {open && (
        <pre className="p-3 bg-white dark:bg-gray-900 text-sm overflow-auto"><code>{code}</code></pre>
      )}
    </div>
  );
}

