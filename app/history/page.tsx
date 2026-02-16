"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, Trash2, Star, Share2, Clock, Loader2, Search } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Modal from "@/src/components/ui/Modal";
import Input from "@/src/components/Input";
import EmptyState from "@/src/components/EmptyState";

type SavedQuery = {
  id: string;
  name: string | null;
  question: string;
  sql: string | null;
  isFavorite: boolean;
  isShared: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  user?: { name: string | null; email: string | null };
};

type Tab = "all" | "favorites" | "shared";

export default function HistoryPage() {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [renameTarget, setRenameTarget] = useState<SavedQuery | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedQuery | null>(null);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadQueries = useCallback(async (p = 1, t: Tab = tab) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (t === "favorites") params.set("favorites", "true");
      if (t === "shared") params.set("shared", "true");

      const res = await fetch(`/api/saved-queries?${params}`, { headers: await getAuth() });
      if (res.ok) {
        const data = await res.json();
        setQueries(data.queries || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  }, [getAuth, tab]);

  useEffect(() => { loadQueries(1, tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFavorite = useCallback(async (q: SavedQuery) => {
    try {
      const res = await fetch(`/api/saved-queries/${q.id}`, {
        method: "PUT",
        headers: await getAuth(),
        body: JSON.stringify({ isFavorite: !q.isFavorite }),
      });
      if (res.ok) {
        setQueries((prev) => prev.map((x) => x.id === q.id ? { ...x, isFavorite: !x.isFavorite } : x));
        toast.success(q.isFavorite ? "Removed from favorites" : "Added to favorites");
      }
    } catch { toast.error("Failed to update"); }
  }, [getAuth]);

  const toggleShare = useCallback(async (q: SavedQuery) => {
    try {
      const res = await fetch(`/api/saved-queries/${q.id}`, {
        method: "PUT",
        headers: await getAuth(),
        body: JSON.stringify({ isShared: !q.isShared }),
      });
      if (res.ok) {
        setQueries((prev) => prev.map((x) => x.id === q.id ? { ...x, isShared: !x.isShared } : x));
        toast.success(q.isShared ? "No longer shared" : "Shared with team");
      }
    } catch { toast.error("Failed to update"); }
  }, [getAuth]);

  const startRename = useCallback((q: SavedQuery) => {
    setRenameTarget(q);
    setRenameValue(q.name || q.question);
    setRenameError(null);
  }, []);

  const closeRename = useCallback(() => {
    setRenameTarget(null);
    setRenameValue("");
    setRenameError(null);
  }, []);

  const handleRenameSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenameError("Name cannot be empty."); return; }
    try {
      const res = await fetch(`/api/saved-queries/${renameTarget.id}`, {
        method: "PUT",
        headers: await getAuth(),
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setQueries((prev) => prev.map((x) => x.id === renameTarget.id ? { ...x, name: trimmed } : x));
        toast.success(`Renamed to "${trimmed}"`);
        closeRename();
      }
    } catch { toast.error("Rename failed"); }
  }, [renameTarget, renameValue, getAuth, closeRename]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/saved-queries/${deleteTarget.id}`, {
        method: "DELETE",
        headers: await getAuth(),
      });
      if (res.ok) {
        setQueries((prev) => prev.filter((x) => x.id !== deleteTarget.id));
        setTotal((t) => t - 1);
        toast.success("Removed from history");
        setDeleteTarget(null);
      }
    } catch { toast.error("Delete failed"); }
  }, [deleteTarget, getAuth]);

  const tabClasses = (t: Tab) =>
    `rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all ${
      tab === t
        ? "border-white/[0.1] bg-white/[0.05] text-white"
        : "border-white/[0.08] text-grape-300 hover:border-white/[0.1] hover:text-white"
    }`;

  const totalPages = Math.ceil(total / 20);

  return (
    <RequireAuth title="Sign in to view your history" description="Your Data Vista history stays private and searchable.">
      <div className="space-y-6">
        {/* Tab filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setTab("all")} className={tabClasses("all")}>
            <Clock className="h-3.5 w-3.5 inline mr-1" />All
          </button>
          <button type="button" onClick={() => setTab("favorites")} className={tabClasses("favorites")}>
            <Star className="h-3.5 w-3.5 inline mr-1" />Favorites
          </button>
          <button type="button" onClick={() => setTab("shared")} className={tabClasses("shared")}>
            <Share2 className="h-3.5 w-3.5 inline mr-1" />Shared
          </button>
          <span className="w-full text-right text-xs text-grape-400 sm:ml-auto sm:w-auto">{total} queries</span>
        </div>

        <Card>
          <CardHeader title="Query History" subtitle="Your saved and auto-saved queries, synced to the cloud." />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-2 py-8 justify-center text-sm text-grape-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
              </div>
            ) : queries.length === 0 ? (
              <EmptyState
                title={tab === "favorites" ? "No favorites yet" : tab === "shared" ? "No shared queries" : "No history yet"}
                message="Run a question from the Ask page and it will appear here automatically."
              />
            ) : (
              <ul className="space-y-2">
                {queries.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/[0.1] sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      {q.name && (
                        <p className="text-sm font-medium text-white mb-0.5 truncate">{q.name}</p>
                      )}
                      <p className="text-sm text-grape-200 truncate">{q.question}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-grape-400">
                        <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                        {q.user?.name && <span>by {q.user.name}</span>}
                        {q.isShared && (
                          <span className="inline-flex items-center gap-1 text-electric-400">
                            <Share2 className="h-3 w-3" /> Shared
                          </span>
                        )}
                        {q.tags.length > 0 && q.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-white/[0.03] px-2 py-0.5 text-[10px] text-grape-300">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-end shrink-0 sm:self-auto">
                      <button
                        onClick={() => toggleFavorite(q)}
                        className={`p-1.5 rounded-lg transition ${q.isFavorite ? "text-warning hover:bg-warning/10" : "text-grape-400 hover:text-warning hover:bg-warning/10"}`}
                        title={q.isFavorite ? "Unfavorite" : "Favorite"}
                      >
                        <Star className={`h-3.5 w-3.5 ${q.isFavorite ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => toggleShare(q)}
                        className={`p-1.5 rounded-lg transition ${q.isShared ? "text-electric-400 hover:bg-electric-500/10" : "text-grape-400 hover:text-electric-400 hover:bg-electric-500/10"}`}
                        title={q.isShared ? "Unshare" : "Share"}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => startRename(q)} className="p-1.5 rounded-lg text-grape-400 hover:text-white hover:bg-white/[0.04] transition" title="Rename">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(q)} className="p-1.5 rounded-lg text-grape-400 hover:text-red-400 hover:bg-red-500/10 transition" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
                <Button variant="secondary" disabled={page <= 1} onClick={() => loadQueries(page - 1)}>Prev</Button>
                <span className="text-xs text-grape-400">Page {page} of {totalPages}</span>
                <Button variant="secondary" disabled={page >= totalPages} onClick={() => loadQueries(page + 1)}>Next</Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Rename Modal */}
      <Modal open={renameTarget !== null} onClose={closeRename}>
        <form className="space-y-6" onSubmit={handleRenameSubmit}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-grape-300">
            <Edit3 className="h-5 w-5" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold text-white">Rename saved query</h2>
            <p className="text-sm text-grape-300">Give this query a clear name so you can find it instantly.</p>
          </div>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
            placeholder="e.g. Weekly revenue snapshot"
            aria-label="Rename query"
            error={renameError || undefined}
          />
          {renameError && <p className="text-xs text-red-400" role="alert">{renameError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeRename}>Cancel</Button>
            <Button type="submit">Save name</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Delete this query?</h2>
            <p className="text-sm text-grape-300">This permanently removes the query from your history.</p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Keep it</Button>
            <Button type="button" variant="secondary" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </RequireAuth>
  );
}
