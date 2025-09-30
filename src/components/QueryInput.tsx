"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import Button from "@/src/components/Button";
import Textarea from "@/src/components/ui/Textarea";

const STORAGE_KEY = "recentQueries";
const MAX_RECENT_ITEMS = 5;

type QueryInputProps = {
  onSubmit: (query: string) => void;
};

export default function QueryInput({ onSubmit }: QueryInputProps) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recentsLabelId = useId();

  useEffect(() => {
    textareaRef.current?.focus();

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecent(parsed.slice(0, MAX_RECENT_ITEMS));
      }
    } catch {
      // ignore malformed JSON – this is best-effort hydration only
    }
  }, []);

  const persistRecent = useCallback((value: string) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];

      const next = [value, ...list.filter((item) => item !== value)].slice(0, MAX_RECENT_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {
      // ignore persistence errors (private browsing, storage quota, etc.)
    }
  }, []);

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      onSubmit(trimmed);
      persistRecent(trimmed);
    },
    [onSubmit, persistRecent],
  );

  const onFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleSubmit(query);
    },
    [handleSubmit, query],
  );

  const suggestionButtons = useMemo(
    () =>
      recent.map((item) => ({
        label: item,
        onSelect: () => {
          setQuery(item);
          handleSubmit(item);
        },
      })),
    [handleSubmit, recent],
  );

  return (
    <form className="space-y-3" onSubmit={onFormSubmit} noValidate>
      <Textarea
        ref={textareaRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rows={3}
        placeholder="e.g., Revenue by day last 30 days"
        aria-describedby={recent.length ? recentsLabelId : undefined}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(query);
          }
        }}
      />

      {suggestionButtons.length > 0 && (
        <div className="space-y-2">
          <p id={recentsLabelId} className="text-xs uppercase tracking-[0.28em] text-slate-400">
            Recent questions
          </p>
          <div className="flex flex-wrap gap-2" role="list">
            {suggestionButtons.map(({ label, onSelect }) => (
              <button
                key={label}
                type="button"
                onClick={onSelect}
                className="px-3 py-1.5 rounded-full border border-accent/60 text-xs text-accent transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Button type="submit">Ask</Button>
      </div>
    </form>
  );
}
