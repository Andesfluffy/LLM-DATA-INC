"use client";
import { useEffect, useState } from "react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";

export default function SavedPage(){
  const [items, setItems] = useState<string[]>([]);
  useEffect(()=>{
    try{ const r = JSON.parse(localStorage.getItem('recentQueries')||'[]'); if(Array.isArray(r)) setItems(r); }catch{}
  },[]);
  function remove(q: string){ const next = items.filter(x=>x!==q); setItems(next); localStorage.setItem('recentQueries', JSON.stringify(next)); }
  function rename(q: string){ const name = prompt('Rename query', q); if(!name) return; const next = items.map(x=> x===q? name : x); setItems(next); localStorage.setItem('recentQueries', JSON.stringify(next)); }
  function run(q: string){ const ev = new CustomEvent('run-saved-query', { detail: q }); window.dispatchEvent(ev); }
  return (
    <div className="space-y-6">
      <Card>
  <CardHeader title="Saved Queries" subtitle="Quickly re‑run your favorite Data Vista questions" />
        <CardBody>
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">No saved queries yet.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((q)=> (
                <li key={q} className="border rounded-2xl p-3 flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{q}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={()=>run(q)}>Run</Button>
                    <Button variant="secondary" onClick={()=>rename(q)}>Rename</Button>
                    <Button variant="secondary" onClick={()=>remove(q)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
