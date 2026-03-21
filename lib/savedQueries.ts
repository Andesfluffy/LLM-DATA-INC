import { getAuthHeaders } from "@/lib/uploadUtils";

export type SavedQuery = {
  id: string;
  question: string;
  savedAt: string;
};

export async function getSavedQueries(): Promise<SavedQuery[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/saved-queries", { headers });
    if (!res.ok) return [];
    return (await res.json()) as SavedQuery[];
  } catch {
    return [];
  }
}

export async function saveQuery(question: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch("/api/saved-queries", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch (e) { console.warn("[savedQueries] save failed:", e); }
}

export async function removeSavedQuery(id: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch("/api/saved-queries", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch (e) { console.warn("[savedQueries] remove failed:", e); }
}

export async function isQuerySaved(question: string): Promise<boolean> {
  const items = await getSavedQueries();
  return items.some((q) => q.question === question);
}
