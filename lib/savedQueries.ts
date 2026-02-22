const STORAGE_KEY = "savedQueries";
const MAX_SAVED = 20;

export type SavedQuery = {
  id: string;
  question: string;
  savedAt: string;
};

export function getSavedQueries(): SavedQuery[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedQuery[]) : [];
  } catch {
    return [];
  }
}

export function saveQuery(question: string): void {
  const items = getSavedQueries().filter((q) => q.question !== question);
  items.unshift({ id: crypto.randomUUID(), question, savedAt: new Date().toISOString() });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_SAVED)));
  } catch { /* storage full — ignore */ }
}

export function removeSavedQuery(id: string): void {
  const items = getSavedQueries().filter((q) => q.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function isQuerySaved(question: string): boolean {
  return getSavedQueries().some((q) => q.question === question);
}
