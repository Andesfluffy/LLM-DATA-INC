"use client";

import { useCallback } from "react";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Card, { CardBody } from "@/src/components/Card";
import Button from "@/src/components/Button";
import { useInsightStream } from "@/src/hooks/useInsightStream";

type InsightPanelProps = {
  question: string;
  sql: string;
  fields: string[];
  rows: Record<string, unknown>[];
};

const TrendIcon = ({ trend }: { trend?: string }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  return <Minus className="h-3.5 w-3.5 text-slate-500" />;
};

export default function InsightPanel({ question, sql, fields, rows }: InsightPanelProps) {
  const { text, loading, error, generate, cancel } = useInsightStream();

  const handleGenerate = useCallback(() => {
    generate({ question, sql, fields, rows });
  }, [generate, question, sql, fields, rows]);

  // Insights are now opt-in — user clicks "Generate Insights" to save AI quota

  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-white">What this means</p>
          </div>
          {loading ? (
            <Button variant="secondary" onClick={cancel} className="w-full text-xs sm:w-auto">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Stop
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleGenerate} className="w-full text-xs sm:w-auto">
              <Sparkles className="h-3.5 w-3.5" />
              {text ? "Regenerate" : "Generate Insights"}
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 mb-3">
            {error}
          </div>
        )}

        {text ? (
          <div className="space-y-3">
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          </div>
        ) : !loading ? (
          <p className="text-sm text-slate-500">
            Click &ldquo;Generate Insights&rdquo; for an AI-powered summary of your results.
          </p>
        ) : (
          <div className="space-y-3 py-1">
            <div className="flex items-center gap-2.5 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
              <span>Reading your results and preparing a summary...</span>
            </div>
            <div className="space-y-2 pl-6">
              <div className="h-3 w-full rounded bg-white/[0.04] animate-skeleton" />
              <div className="h-3 w-4/5 rounded bg-white/[0.04] animate-skeleton" style={{ animationDelay: "200ms" }} />
              <div className="h-3 w-3/5 rounded bg-white/[0.04] animate-skeleton" style={{ animationDelay: "400ms" }} />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
