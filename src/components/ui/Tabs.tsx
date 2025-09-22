"use client";
import React, { ReactNode, useState } from "react";

export function Tabs({ tabs, initial = 0, onChange }: { tabs: { label: string; content: ReactNode }[]; initial?: number; onChange?: (i: number)=>void }) {
  const [index, setIndex] = useState(initial);
  function select(i: number){ setIndex(i); onChange?.(i); }
  return (
    <div>
      <div className="flex gap-2 border-b border-pink-500/30">
        {tabs.map((t, i)=> (
          <button key={i} onClick={()=>select(i)} className={`px-4 py-2 text-base rounded-t-xl transition-colors duration-150 ${i===index? 'text-pink-400 border-b-2 border-pink-400 font-bold bg-[#23263a]/60 shadow' : 'text-slate-200 hover:text-pink-400'}`}>{t.label}</button>
        ))}
      </div>
      <div className="pt-4">{tabs[index]?.content}</div>
    </div>
  );
}

