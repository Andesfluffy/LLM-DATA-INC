"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Star } from "lucide-react";
import Modal from "@/src/components/ui/Modal";
import Button from "@/src/components/Button";

type SavedQueryItem = {
  id: string;
  name: string | null;
  question: string;
  isFavorite: boolean;
};

type AddWidgetModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (savedQueryId: string) => void;
};

export default function AddWidgetModal({ open, onClose, onAdd }: AddWidgetModalProps) {
  const [queries, setQueries] = useState<SavedQueryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
        const res = await fetch("/api/saved-queries?limit=50", {
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setQueries(data.queries || []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open]);

  const handleAdd = useCallback((id: string) => {
    onAdd(id);
    onClose();
  }, [onAdd, onClose]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">Add to Dashboard</h2>
          <p className="text-sm text-grape-400 mt-1">Pick a saved query to display on your dashboard.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-grape-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your queries...
          </div>
        ) : queries.length === 0 ? (
          <p className="text-sm text-grape-400 text-center py-6">
            No saved queries yet. Ask some questions first, then come back here.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {queries.map((q) => (
              <div
                key={q.id}
                className="flex flex-col items-stretch gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/[0.1] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">
                    {q.isFavorite && <Star className="h-3 w-3 text-amber-400 fill-current inline mr-1" />}
                    {q.name || q.question}
                  </p>
                  {q.name && (
                    <p className="text-xs text-grape-400 truncate">{q.question}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleAdd(q.id)}
                  className="w-full text-xs shrink-0 sm:w-auto"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
