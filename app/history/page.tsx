"use client";
import { useEffect, useState } from "react";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";

export default function HistoryPage() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentQueries") || "[]");
      if (Array.isArray(stored)) setItems(stored);
    } catch {
      // ignore parsing issues
    }
  }, []);

  function remove(query: string) {
    const next = items.filter((value) => value !== query);
    setItems(next);
    localStorage.setItem("recentQueries", JSON.stringify(next));
  }

  function rename(query: string) {
    const name = prompt("Rename entry", query);
    if (!name) return;
    const next = items.map((value) => (value === query ? name : value));
    setItems(next);
    localStorage.setItem("recentQueries", JSON.stringify(next));
  }

  function run(query: string) {
    const event = new CustomEvent("run-history-query", { detail: query });
    window.dispatchEvent(event);
  }

  return (
    <RequireAuth title="Sign in to view your history" description="Your Data Vista history stays private and searchable.">
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="History"
            subtitle="Replay the conversations and queries that moved work forward"
          />
          <CardBody>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">No history yet.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((query) => (
                  <li
                    key={query}
                    className="border border-[#2A2D3A] bg-[#0B0F12]/70 rounded-2xl p-3 flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-sm text-slate-100">{query}</span>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => run(query)}>
                        Replay
                      </Button>
                      <Button variant="secondary" onClick={() => rename(query)}>
                        Rename
                      </Button>
                      <Button variant="secondary" onClick={() => remove(query)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireAuth>
  );
}
