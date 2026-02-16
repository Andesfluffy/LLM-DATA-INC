"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ParsedTable } from "@/lib/schemaParser";

export function useSchemaInfo() {
  const [tables, setTables] = useState<ParsedTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  const fetchSchema = useCallback(async () => {
    if (fetched.current) return;

    const orgId = localStorage.getItem("orgId");
    const datasourceId = localStorage.getItem("datasourceId");
    if (!orgId || !datasourceId) return;

    setLoading(true);
    setError(null);
    fetched.current = true;

    try {
      const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
      const res = await fetch(
        `/api/datasources/schema-info?orgId=${encodeURIComponent(orgId)}&datasourceId=${encodeURIComponent(datasourceId)}`,
        {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load schema");
      }
      const data = await res.json();
      setTables(data.tables || []);
    } catch (e: any) {
      setError(e.message || "Failed to load schema");
      fetched.current = false; // allow retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  return { tables, loading, error };
}
