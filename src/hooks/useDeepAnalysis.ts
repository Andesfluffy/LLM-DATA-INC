"use client";

import { useCallback, useRef, useState } from "react";

type DeepAnalysisParams = {
  question: string;
  datasourceId: string;
};

export function useDeepAnalysis() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (params: DeepAnalysisParams) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setError(null);
    setLoading(true);

    try {
      const idToken = await (
        await import("@/lib/firebase/client")
      ).auth.currentUser?.getIdToken();

      const res = await fetch("/api/analysis/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setError(parsed.error);
              break;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setText(accumulated);
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to generate analysis");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setText("");
    setError(null);
    setLoading(false);
  }, []);

  return { text, loading, error, analyze, cancel, reset };
}
