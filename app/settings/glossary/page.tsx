"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import RequireAuth from "@/src/components/RequireAuth";
import Modal from "@/src/components/ui/Modal";
import { toast } from "@/src/components/ui/Toast";

type GlossaryTerm = {
  id: string;
  term: string;
  definition: string;
  description: string | null;
  category: string;
};

type FormState = {
  term: string;
  definition: string;
  description: string;
  category: string;
};

const emptyForm: FormState = { term: "", definition: "", description: "", category: "metric" };

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const getOrgId = useCallback(() => {
    try { return localStorage.getItem("orgId") || ""; } catch { return ""; }
  }, []);

  const loadTerms = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = getOrgId();
      if (!orgId) { setTerms([]); return; }
      const res = await fetch(`/api/glossary?orgId=${encodeURIComponent(orgId)}`, {
        headers: await getAuth(),
      });
      if (res.ok) {
        const data = await res.json();
        setTerms(data.terms || []);
      }
    } catch (err) {
      console.error("Failed to load glossary", err);
    } finally {
      setLoading(false);
    }
  }, [getAuth, getOrgId]);

  useEffect(() => { loadTerms(); }, [loadTerms]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((t: GlossaryTerm) => {
    setEditingId(t.id);
    setForm({ term: t.term, definition: t.definition, description: t.description || "", category: t.category });
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await getAuth();
      if (editingId) {
        const res = await fetch(`/api/glossary/${editingId}`, {
          method: "PUT", headers, body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
        toast.success("Term updated");
      } else {
        const res = await fetch("/api/glossary", {
          method: "POST", headers,
          body: JSON.stringify({ ...form, orgId: getOrgId() }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to create");
        toast.success("Term created");
      }
      setShowModal(false);
      loadTerms();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editingId, form, getAuth, getOrgId, loadTerms]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/glossary/${deleteId}`, {
        method: "DELETE", headers: await getAuth(),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Term deleted");
      setDeleteId(null);
      loadTerms();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }, [deleteId, getAuth, loadTerms]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const categoryColors: Record<string, string> = {
    metric: "bg-white/[0.05] text-grape-300 border-white/[0.08]",
    dimension: "bg-mint-500/10 text-mint-400 border-mint-500/30",
    filter: "bg-warning/10 text-warning border-warning/30",
  };

  return (
    <RequireAuth title="Sign in to manage glossary" description="Define business terms for better AI-generated SQL.">
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-grape-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Business Glossary</h1>
          </div>
          <p className="text-grape-300 text-sm max-w-lg">
            Define what business terms mean in SQL so the AI generates accurate queries. For example, map &quot;revenue&quot; to <code className="px-1.5 py-0.5 rounded bg-white/[0.03] text-grape-200 font-mono text-[11px]">SUM(orders.total_amount)</code>.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={openAdd} variant="primary" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Term
          </Button>
        </div>

        <Card>
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-grape-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading glossary...
              </div>
            ) : terms.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-10 w-10 text-grape-500 mx-auto mb-3" />
                <p className="text-grape-300 text-sm">No terms defined yet. Add your first business term to improve query accuracy.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-grape-400 font-medium">Term</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-grape-400 font-medium">Definition</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-grape-400 font-medium">Category</th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-grape-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((t) => (
                      <tr key={t.id} className="border-b border-white/[0.06] hover:bg-white/[0.04] transition">
                        <td className="py-3 px-4">
                          <span className="font-medium text-white">{t.term}</span>
                          {t.description && <p className="text-xs text-grape-400 mt-0.5">{t.description}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono text-white bg-white/[0.03] rounded px-2 py-1">{t.definition}</code>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColors[t.category] || "text-grape-300"}`}>
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-grape-400 hover:text-white hover:bg-white/[0.04] transition" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded-lg text-grape-400 hover:text-red-400 hover:bg-red-500/10 transition" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Add/Edit Modal */}
        <Modal open={showModal} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{editingId ? "Edit Term" : "Add Term"}</h2>
              <Input label="Term" value={form.term} onChange={(e) => update("term", (e.target as HTMLInputElement).value)} placeholder='e.g., "revenue"' />
              <Input label="SQL Definition" value={form.definition} onChange={(e) => update("definition", (e.target as HTMLInputElement).value)} placeholder="e.g., SUM(orders.total_amount)" />
              <Input label="Description (optional)" value={form.description} onChange={(e) => update("description", (e.target as HTMLInputElement).value)} placeholder="Plain-English explanation" />
              <div>
                <label className="block text-sm font-medium text-grape-100 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-grape-50 focus:border-white/[0.15] focus:outline-none focus:ring-1 focus:ring-white/[0.1]"
                >
                  <option value="metric">Metric</option>
                  <option value="dimension">Dimension</option>
                  <option value="filter">Filter</option>
                </select>
              </div>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save"}
                </Button>
              </div>
            </form>
          </Modal>


        {/* Delete Confirmation */}
        <Modal open={!!deleteId} onClose={() => setDeleteId(null)}>
            <h2 className="text-lg font-semibold text-white mb-2">Delete Term</h2>
            <p className="text-sm text-grape-300 mb-4">Are you sure? This will remove the term from your glossary and may affect future query accuracy.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</Button>
            </div>
          </Modal>
      </div>
    </RequireAuth>
  );
}
