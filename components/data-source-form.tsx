"use client";
import { useEffect, useState } from "react";
import Button from "@/src/components/Button";

type Props = { initial?: { id: string; name: string; url: string } | null };

export default function DataSourceForm({ initial }: Props) {
  const [name, setName] = useState(initial?.name || "Primary");
  const [url, setUrl] = useState(initial?.url || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) {
      fetch("/api/datasource")
        .then((r) => r.json())
        .then((d) => {
          if (d?.dataSource) {
            setName(d.dataSource.name);
            setUrl(d.dataSource.url);
          }
        })
        .catch(() => {});
    }
  }, [initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/datasource", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
    setSaving(false);
    if (res.ok) setMessage("Saved"); else setMessage("Failed to save");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input className="border rounded w-full px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm mb-1">Postgres URL</label>
        <input className="border rounded w-full px-3 py-2 font-mono" value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="postgresql://user:pass@host:5432/db" />
      </div>
      <Button type="submit" disabled={saving} variant="secondary" className="min-w-[96px] justify-center">{saving ? "Saving..." : "Save"}</Button>
      {message && <span className="text-sm ml-2">{message}</span>}
    </form>
  );
}

