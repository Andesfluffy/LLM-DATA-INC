"use client";

import {
  MessageSquare,
  Database,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import Button from "@/src/components/Button";
import Card, { CardBody } from "@/src/components/Card";
import QueryInput from "@/src/components/QueryInput";

const QueryBuilder = dynamic(() => import("@/src/components/QueryBuilder"));

type QueryInputCardProps = {
  hasDatasource: boolean;
  inputMode: "text" | "builder";
  setInputMode: (mode: "text" | "builder") => void;
  threadLength: number;
  onClearThread: () => void;
  onAsk: (prompt: string) => void;
  busy: boolean;
  error: string | null;
  isActivatingDemo: boolean;
  onActivateDemo: () => void;
  onConnectClick: () => void;
};

export default function QueryInputCard({
  hasDatasource,
  inputMode,
  setInputMode,
  threadLength,
  onClearThread,
  onAsk,
  busy,
  error,
  isActivatingDemo,
  onActivateDemo,
  onConnectClick,
}: QueryInputCardProps) {
  return (
    <Card className="no-print">
      <CardBody>
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">
                {hasDatasource ? "Ask your data" : "Connect your data"}
              </p>
              <p className="text-xs text-grape-300 mt-0.5 leading-tight">
                {hasDatasource
                  ? "Insights, trends, forecasts — plain English"
                  : "Connect a database or upload a spreadsheet"}
              </p>
            </div>
          </div>
          <Button
            variant={hasDatasource ? "secondary" : "primary"}
            onClick={onConnectClick}
            className="shrink-0 text-xs !px-2.5 !py-1.5"
          >
            <Database className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">
              {hasDatasource ? "Switch Source" : "Connect"}
            </span>
          </Button>
        </div>

        {!hasDatasource && (
          <div className="text-center py-6 sm:py-8">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-white/[0.04] flex items-center justify-center">
              <Database className="h-5 w-5 text-grape-300" />
            </div>
            <p className="font-semibold text-base text-white mb-1">Connect your data to get started</p>
            <p className="text-sm text-grape-300 mb-4 max-w-xs mx-auto">
              Link your database and start getting real-time insights instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
              <Button variant="primary" onClick={onConnectClick}>
                <Database className="h-4 w-4" />
                Connect a Database
              </Button>
              <Button variant="secondary" onClick={onActivateDemo} disabled={isActivatingDemo}>
                {isActivatingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Try Sample Data
              </Button>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2 items-center justify-center">
              {["Total sales last month?", "Next quarter revenue?", "Customers at risk?"].map((ex) => (
                <span key={ex} className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-grape-300 text-xs">
                  {ex}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input mode toggle */}
        {hasDatasource && (
          <div className="mb-3 flex items-center gap-1.5">
            {(["text", "builder"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  inputMode === mode
                    ? "border-white/[0.15] bg-white/[0.06] text-white"
                    : "border-white/[0.06] text-grape-300 hover:text-grape-200"
                }`}
              >
                {mode === "text" ? "Type a question" : "Use the builder"}
              </button>
            ))}
          </div>
        )}

        {inputMode === "text" ? (
          <>
            {threadLength > 0 && (
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-grape-300">
                  Follow-up · {threadLength} {threadLength === 1 ? "turn" : "turns"}
                </p>
                <button
                  type="button"
                  onClick={onClearThread}
                  className="flex items-center gap-1 text-xs text-grape-300 hover:text-white transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  New
                </button>
              </div>
            )}
            <QueryInput onSubmit={onAsk} threadLength={threadLength} />
          </>
        ) : (
          <QueryBuilder onSubmit={onAsk} />
        )}

        {busy && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
            <Loader2 className="h-4 w-4 text-grape-300 animate-spin shrink-0" />
            <p className="text-sm text-grape-200" aria-live="polite">
              Analyzing your data…
            </p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p role="alert" className="text-sm text-red-300" aria-live="assertive">{error}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
