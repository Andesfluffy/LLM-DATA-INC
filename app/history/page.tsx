"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Modal from "@/src/components/ui/Modal";
import Input from "@/src/components/Input";
import EmptyState from "@/src/components/EmptyState";

export default function HistoryPage() {
  const [items, setItems] = useState<string[]>([]);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentQueries") || "[]");
      if (Array.isArray(stored)) {
        setItems(stored);
      }
    } catch {
      // ignore parsing issues – this history is best-effort only
    }
  }, []);

  const persist = useCallback((next: string[]) => {
    setItems(next);
    localStorage.setItem("recentQueries", JSON.stringify(next));
  }, []);

  const startRename = useCallback((query: string) => {
    setRenameTarget(query);
    setRenameValue(query);
    setRenameError(null);
  }, []);

  const closeRename = useCallback(() => {
    setRenameTarget(null);
    setRenameValue("");
    setRenameError(null);
  }, []);

  const startDelete = useCallback((query: string) => {
    setDeleteTarget(query);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const next = items.filter((value) => value !== target);
    persist(next);
    toast.success("Removed from history.");
    setDeleteTarget(null);
  }, [deleteTarget, items, persist]);

  const handleRenameSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renameTarget) return;

    const target = renameTarget;
    const trimmed = renameValue.trim();

    if (!trimmed) {
      setRenameError("Name cannot be empty.");
      return;
    }

    if (trimmed === target) {
      closeRename();
      return;
    }

    const exists = items.some((value) => value === trimmed && value !== target);
    if (exists) {
      setRenameError("You already saved that name.");
      return;
    }

    const next = items.map((value) => (value === target ? trimmed : value));
    persist(next);
    toast.success(`Renamed to "${trimmed}"`);
    closeRename();
  }, [closeRename, items, persist, renameTarget, renameValue]);

  const hasItems = useMemo(() => items.length > 0, [items]);

  return (
    <RequireAuth title="Sign in to view your history" description="Your Data Vista history stays private and searchable.">
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="History"
            subtitle="Curate the saved prompts and summaries that keep your team aligned."
          />
          <CardBody>
            {!hasItems ? (
              <EmptyState
                title="No history yet"
                message="Run a question to create a local-only bookmark."
              />
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((query) => (
                  <li
                    key={query}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-[#2A2D3A] bg-[#0B0F12]/70 p-3"
                  >
                    <span className="truncate text-sm text-slate-100">{query}</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => startRename(query)}>
                        Rename
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => startDelete(query)}>
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

      <Modal open={renameTarget !== null} onClose={closeRename}>
        <form className="space-y-6" onSubmit={handleRenameSubmit}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Edit3 className="h-5 w-5" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold text-white">Rename saved query</h2>
            <p className="text-sm text-slate-300">
              Give this entry a clear title so you can find it instantly later.
            </p>
          </div>
          <Input
            autoFocus
            value={renameValue}
            onChange={(event) => {
              setRenameValue(event.target.value);
              setRenameError(null);
            }}
            placeholder="e.g. Weekly revenue snapshot"
            aria-label="Rename query"
            error={renameError || undefined}
            aria-describedby={renameError ? "rename-error" : undefined}
          />
          {renameError && (
            <p id="rename-error" className="text-xs text-rose-300" role="alert" aria-live="assertive">
              {renameError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeRename}>
              Cancel
            </Button>
            <Button type="submit">Save name</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTarget !== null} onClose={cancelDelete}>
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Remove this history entry?</h2>
            <p className="text-sm text-slate-300">
              This action removes the saved query from your local history. You can always rerun it manually later.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={cancelDelete}>
              Keep it
            </Button>
            <Button type="button" variant="secondary" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </RequireAuth>
  );
}
