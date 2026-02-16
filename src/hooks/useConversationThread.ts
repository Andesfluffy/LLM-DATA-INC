"use client";

import { useCallback, useState } from "react";

export type ConversationTurn = {
  question: string;
  sql: string;
};

const MAX_TURNS = 5;

export function useConversationThread() {
  const [thread, setThread] = useState<ConversationTurn[]>([]);

  const addTurn = useCallback((question: string, sql: string) => {
    setThread((prev) => [...prev, { question, sql }].slice(-MAX_TURNS));
  }, []);

  const clearThread = useCallback(() => {
    setThread([]);
  }, []);

  return { thread, addTurn, clearThread };
}
