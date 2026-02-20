export type DataSourceSummary = {
  id: string;
  name: string;
  type: string | null;
  host: string | null;
  port: number | null;
  database: string | null;
  user: string | null;
  hasPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
  scopedTables?: string[];
};

async function getIdToken(): Promise<string | undefined> {
  const firebase = await import("@/lib/firebase/client");
  const currentUser = firebase.auth.currentUser;
  if (!currentUser) return undefined;
  try {
    return await currentUser.getIdToken();
  } catch {
    return undefined;
  }
}

export async function fetchAccessibleDataSources(): Promise<DataSourceSummary[]> {
  const idToken = await getIdToken();
  const res = await fetch("/api/datasources/list", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    cache: "no-store",
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      return [];
    }
    const message = payload?.error || `Failed to load data sources (${res.status})`;
    throw new Error(message);
  }

  const list = Array.isArray(payload?.dataSources) ? payload.dataSources : [];
  return list as DataSourceSummary[];
}

export async function deleteAccessibleDataSource(id: string): Promise<{ ok: boolean; cleanupWarning?: string }> {
  const idToken = await getIdToken();
  const res = await fetch(`/api/datasources/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message = payload?.error || `Failed to delete data source (${res.status})`;
    throw new Error(message);
  }

  return { ok: Boolean(payload?.ok), cleanupWarning: payload?.cleanupWarning || undefined };
}
