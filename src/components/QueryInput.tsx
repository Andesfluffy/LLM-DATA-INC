"use client";
import { useEffect, useRef, useState } from "react";
import Textarea from "@/src/components/ui/Textarea";
import Button from "@/src/components/Button";

export default function QueryInput({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(()=>{ ref.current?.focus(); try{ const r = JSON.parse(localStorage.getItem('recentQueries')||'[]'); if(Array.isArray(r)) setRecent(r.slice(0,5)); }catch{} },[]);
  function saveRecent(val: string){ try{ const arr = JSON.parse(localStorage.getItem('recentQueries')||'[]'); const list: string[] = Array.isArray(arr)?arr:[]; const next=[val,...list.filter(x=>x!==val)].slice(0,5); localStorage.setItem('recentQueries', JSON.stringify(next)); setRecent(next);}catch{} }
  function submit(){ if(!q.trim()) return; onSubmit(q.trim()); saveRecent(q.trim()); }
  return (
    <div className="space-y-2">
      <Textarea ref={ref as any} value={q} onChange={(e)=>setQ(e.target.value)} rows={3} placeholder="e.g., Revenue by day last 30 days" onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); submit(); } }} />
      {recent.length>0 && (
        <div className="flex flex-wrap gap-2">
          {recent.map((r,i)=> (
            <button
              key={i}
              onClick={()=>{ setQ(r); setTimeout(()=>submit(),0); }}
              className="px-3 py-1.5 rounded-full border border-accent/60 text-xs text-accent transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {r}
            </button>
          ))}
        </div>
      )}
      <div><Button onClick={submit}>Ask</Button></div>
    </div>
  );
}
