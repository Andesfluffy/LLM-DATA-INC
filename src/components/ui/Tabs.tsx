"use client";
import React, { ReactNode, useState } from "react";

export function Tabs({ tabs, initial = 0, onChange }: { tabs: { label: string; content: ReactNode }[]; initial?: number; onChange?: (i: number) => void }) {
  const [index, setIndex] = useState(initial);

  function select(i: number) {
    setIndex(i);
    onChange?.(i);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => select(i)}
            className={`rounded-full border border-accent/60 px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${i === index ? 'border-accent text-accent bg-accent/10 shadow-sm' : 'text-slate-300 hover:text-accent hover:border-accent/80'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{tabs[index]?.content}</div>
    </div>
  );
}
