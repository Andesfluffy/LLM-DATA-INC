"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import Button from "@/src/components/Button";
import Textarea from "@/src/components/ui/Textarea";

const STORAGE_KEY = "recentQueries";
const MAX_RECENT_ITEMS = 5;

const STARTER_EXAMPLES = [
  "What are my top 10 best-selling products?",
  "Show total revenue by month this year",
  "How many new customers joined last month?",
  "What's the average order value?",
  "Which region has the most orders?",
];

type QueryInputProps = {
  onSubmit: (query: string) => void;
  threadLength?: number;
};

export default function QueryInput({ onSubmit, threadLength = 0 }: QueryInputProps) {
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
      // ignore malformed JSON
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
      // ignore persistence errors
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

  const showStarters = recent.length === 0;

  return (
    <form className="space-y-3" onSubmit={onFormSubmit} noValidate>
      <Textarea
        ref={textareaRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rows={3}
        placeholder={
          threadLength > 0
            ? "Ask a follow-up, e.g. \"now filter by last quarter\" or \"break that down by region\""
            : "Ask a question about your data in plain English, e.g. \"What were our top 5 products last month?\""
        }
        aria-describedby={recent.length ? recentsLabelId : undefined}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(query);
          }
        }}
      />

      <p className="text-[11px] text-grape-500">
        Tip: Just type your question like you&apos;d ask a colleague. No technical knowledge needed.
      </p>

      {showStarters && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-grape-400">
            Try one of these to get started
          </p>
          <div className="flex flex-wrap gap-2" role="list">
            {STARTER_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  handleSubmit(example);
                }}
                className="px-3 py-1.5 rounded-full border border-white/[0.08] text-xs text-grape-300 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {suggestionButtons.length > 0 && (
        <div className="space-y-2">
          <p id={recentsLabelId} className="text-xs uppercase tracking-[0.28em] text-grape-400">
            Your recent questions
          </p>
          <div className="flex flex-wrap gap-2" role="list">
            {suggestionButtons.map(({ label, onSelect }) => (
              <button
                key={label}
                type="button"
                onClick={onSelect}
                className="px-3 py-1.5 rounded-full border border-white/[0.08] text-xs text-grape-300 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
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
