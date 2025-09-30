"use client";

import { useCallback, useEffect, useState } from "react";

type ActiveDataSourceResponse = {
  org: { id: string; name: string | null };
  user: { id: string; email: string | null; name: string | null };
  datasource: {
    id: string;
    name: string | null;
    type: string | null;
    host: string | null;
    port: number | null;
    database: string | null;
    user: string | null;
  } | null;
};

type ActiveDataSourceState = ActiveDataSourceResponse | null;

type UseActiveDataSourceResult = {
  data: ActiveDataSourceState;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<ActiveDataSourceState>;
};

async function getIdToken(): Promise<string | undefined> {
  try {
    const { auth } = await import("@/lib/firebase/client");
    if (!auth.currentUser) return undefined;
    return await auth.currentUser.getIdToken();
  } catch {
    return undefined;
  }
}

export function useActiveDataSource(): UseActiveDataSourceResult {
  const [data, setData] = useState<ActiveDataSourceState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const headers: Record<string, string> = {};
      if (idToken) headers.Authorization = `Bearer ${idToken}`;
      const res = await fetch("/api/datasources/active", { headers, cache: "no-store" });
      let payload: ActiveDataSourceResponse | null = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      if (!res.ok) {
        throw new Error((payload as any)?.error || "Failed to load active data source");
      }
      setData(payload);
      return payload;
    } catch (err: any) {
      const message = err?.message || "Failed to load active data source";
      setError(message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
