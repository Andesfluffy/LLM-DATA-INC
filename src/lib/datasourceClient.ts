export type DataSourceSummary = {
  id: string;
  orgId: string | null;
  name: string;
  host: string | null;
  port: number | null;
  database: string | null;
  user: string | null;
  hasPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
