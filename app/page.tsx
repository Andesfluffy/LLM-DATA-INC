"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Code2, Table2, BarChart3, Download, AlertCircle, Loader2, RotateCcw, Database } from "lucide-react";
import OnboardingWizard from "@/src/components/onboarding/OnboardingWizard";
import { useConversationThread } from "@/src/hooks/useConversationThread";
import { useFirebaseAuth } from "@/src/hooks/useFirebaseAuth";

import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import Button from "@/src/components/Button";
import Card, { CardBody } from "@/src/components/Card";
import CodeBlock from "@/src/components/CodeBlock";
import EmptyState from "@/src/components/EmptyState";
import FeatureGrid from "@/src/components/landing/FeatureGrid";
import HowItWorks from "@/src/components/landing/HowItWorks";
import MosaicHero from "@/src/components/landing/MosaicHero";
import QueryInput from "@/src/components/QueryInput";
import QueryBuilder from "@/src/components/QueryBuilder";

import InsightPanel from "@/src/components/InsightPanel";
import ResultsChart from "@/src/components/ResultsChart";
import ResultsTable from "@/src/components/ResultsTable";
import { toast } from "@/src/components/ui/Toast";
import ConnectDatabaseModal from "@/src/components/ConnectDatabaseModal";
import { fetchAccessibleDataSources } from "@/src/lib/datasourceClient";

type QueryResult = {
  sql: string;
  fields: string[];
  rows: Record<string, unknown>[];
};

type ConnectionIds = {
  datasourceId: string;
};

export default function HomePage() {
  const { user, loading } = useFirebaseAuth();
  const prevUser = useRef(user);

  // Scroll to top when user transitions from signed-out → signed-in
  useEffect(() => {
    if (!prevUser.current && user) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    prevUser.current = user;
  }, [user]);

  const [result, setResult] = useState<QueryResult | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasDatasource, setHasDatasource] = useState(false);
  const [view, setView] = useState<"table" | "chart">("table");
  const [showSql, setShowSql] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { thread, addTurn, clearThread } = useConversationThread();
  const [inputMode, setInputMode] = useState<"text" | "builder">("text");
  const [showConnectModal, setShowConnectModal] = useState(false);

  const syncFromLocalStorage = useCallback(() => {
    try {
      const datasourceId = localStorage.getItem("datasourceId");
      setHasDatasource(Boolean(datasourceId));
    } catch {
      setHasDatasource(false);
    }
  }, []);

  const resolveConnectionIds = useCallback(async (): Promise<ConnectionIds | null> => {
    try {
      let datasourceId = localStorage.getItem("datasourceId");

      if (datasourceId) {
        return { datasourceId };
      }

      const list = await fetchAccessibleDataSources();
      if (list.length > 0) {
        const first = list[0]!;
        datasourceId = first.id;
        localStorage.setItem("datasourceId", datasourceId);
      }

      if (datasourceId) {
        return { datasourceId };
      }
    } catch (err) {
      console.error("Failed to resolve data source ids", err);
    }

    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        await resolveConnectionIds();
      } finally {
        if (!cancelled) {
          syncFromLocalStorage();
        }
      }
    };

    syncFromLocalStorage();
    hydrate();

    const onFocus = () => syncFromLocalStorage();
    const onStorage = () => syncFromLocalStorage();

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, resolveConnectionIds, syncFromLocalStorage]);

  // Check onboarding status — show wizard if no datasource is configured
  useEffect(() => {
    const datasourceId = localStorage.getItem("datasourceId");
    setShowOnboarding(!datasourceId);
    setOnboardingChecked(true);
  }, [user]);

  // Allow re-opening the tutorial from the user menu
  useEffect(() => {
    const handler = () => setShowOnboarding(true);
    window.addEventListener("show-tutorial", handler);
    return () => window.removeEventListener("show-tutorial", handler);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    syncFromLocalStorage();
  }, [syncFromLocalStorage]);

  const onAsk = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt) return;

      setBusy(true);
      setError(null);
      setResult(null);
      setLastQuestion(prompt);

      try {
        const ids = await resolveConnectionIds();
        if (!ids) {
          const message = "Please configure a data source in Settings.";
          setError(message);
          toast.error(message);
          return;
        }

        const { datasourceId } = ids;
        const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
        const response = await fetch("/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            datasourceId,
            question: prompt,
            ...(thread.length > 0 ? { history: thread } : {}),
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          const message = payload?.error || "Request failed";
          throw new Error(message);
        }

        setResult(payload);
        addTurn(prompt, payload.sql);
        toast.success("Query ran successfully");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [resolveConnectionIds, thread, addTurn],
  );

  const downloadCsv = useCallback(() => {
    if (!result?.rows?.length) return;

    const headers = result.fields;
    const escapeCell = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      return /[",\n]/.test(stringValue)
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    };

    const lines = [headers.join(",")];
    for (const row of result.rows) {
      lines.push(headers.map((field) => escapeCell((row as Record<string, unknown>)[field])).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const hasRows = useMemo(() => Boolean(result?.rows && result.rows.length > 0), [result]);

  const handleViewChange = useCallback((next: "table" | "chart") => {
    setView(next);
  }, []);

  // Show a loading skeleton while Firebase resolves auth state
  if (loading) {
    return (
      <div className="space-y-6 py-12">
        <Skeleton className="mx-auto h-12 w-2/3 rounded-xl" />
        <Skeleton className="mx-auto h-6 w-1/2 rounded-lg" />
        <Skeleton className="mx-auto h-48 w-full max-w-4xl rounded-2xl" />
      </div>
    );
  }

  // Not signed in — show the landing hero
  if (!user) {
    return <MosaicHero />;
  }

  // Signed in — show the main app
  return (
    <>
          {showOnboarding && onboardingChecked ? (
            <div className="py-12">
              <OnboardingWizard onComplete={handleOnboardingComplete} />
            </div>
          ) : (
            <div className="space-y-16 sm:space-y-20">

              <div className="divider-gradient" />
              <FeatureGrid brandName="Data Vista" />

              <div className="divider-gradient" />
              <HowItWorks brandName="Data Vista" />

              {/* Ask Section */}
              <section id="ask" className="scroll-mt-24 space-y-6">
                <div className="text-center mb-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-grape-400 mb-3">Your data, your way</p>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
                    Ask any question about your data
                  </h2>
                  <p className="text-sm text-grape-300 mt-2 max-w-md mx-auto">
                    Just type what you want to know in plain English. No technical skills required.
                  </p>
                </div>

                <Card>
                  <CardBody>
                    <div className="mb-4 flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-white">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {hasDatasource ? "Ask a question about your data" : "Connect your data to get started"}
                          </p>
                          {hasDatasource ? (
                            <p className="text-xs text-grape-400 mt-0.5">Type in plain English - no coding needed</p>
                          ) : (
                            <p className="text-xs text-grape-400 mt-0.5">Connect a database or upload a spreadsheet first</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={hasDatasource ? "secondary" : "primary"}
                        onClick={() => setShowConnectModal(true)}
                        className="shrink-0 text-xs !px-3 !py-1.5"
                      >
                        <Database className="h-3.5 w-3.5" />
                        {hasDatasource ? "Switch Source" : "Connect Database"}
                      </Button>
                    </div>
              {!hasDatasource && (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-white/[0.04] flex items-center justify-center">
                    <Database className="h-6 w-6 text-grape-400" />
                  </div>
                  <p className="font-semibold text-lg text-white mb-1">No data connected yet</p>
                  <p className="text-sm text-grape-400 mb-5 max-w-sm mx-auto">
                    Connect your database or upload a spreadsheet to start asking questions.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowConnectModal(true)}
                  >
                    <Database className="h-4 w-4" />
                    Connect a Database
                  </Button>
                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {["What were total sales last month?", "Show me top customers", "Revenue by region"].map((ex) => (
                      <span key={ex} className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-grape-400 text-xs">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              )}

{/* Modal moved to root level */}

              {/* Input mode toggle */}
              {hasDatasource && (
                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      inputMode === "text"
                        ? "border-white/[0.15] bg-white/[0.06] text-white"
                        : "border-white/[0.06] text-grape-400 hover:text-grape-300"
                    }`}
                  >
                    Type a question
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("builder")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      inputMode === "builder"
                        ? "border-white/[0.15] bg-white/[0.06] text-white"
                        : "border-white/[0.06] text-grape-400 hover:text-grape-300"
                    }`}
                  >
                    Use the builder
                  </button>
                </div>
              )}

              {inputMode === "text" ? (
                <>
                  {thread.length > 0 && (
                    <div className="mb-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-grape-300">
                        Follow-up mode - building on {thread.length} previous {thread.length === 1 ? "question" : "questions"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          clearThread();
                          setResult(null);
                          setError(null);
                          setLastQuestion("");
                        }}
                        className="flex items-center gap-1 text-xs text-grape-400 hover:text-white transition"
                      >
                        <RotateCcw className="h-3 w-3" />
                        New conversation
                      </button>
                    </div>
                  )}
                  <QueryInput onSubmit={onAsk} threadLength={thread.length} />
                </>
              ) : (
                <QueryBuilder onSubmit={onAsk} />
              )}
              {busy && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                  <Loader2 className="h-4 w-4 text-grape-300 animate-spin shrink-0" />
                  <p className="text-sm text-grape-200" aria-live="polite">
                    Understanding your question and finding the answer... This usually takes a few seconds.
                  </p>
                </div>
              )}
              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p role="alert" className="text-sm text-red-300" aria-live="polite">{error}</p>
                </div>
                    )}
                  </CardBody>
                </Card>

                {/* Results */}
                <Card>
                  <CardBody>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-white">
                          <Table2 className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold text-white">Your Results</p>
                        {hasRows && result && (
                          <span className="text-xs text-grape-400 ml-1">
                            ({result.rows.length} {result.rows.length === 1 ? "row" : "rows"} found)
                          </span>
                        )}
                      </div>
                  {hasRows && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewChange("table")}
                            aria-pressed={view === "table"}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                              view === "table"
                                ? "border-white/[0.15] bg-white/[0.06] text-white shadow-sm"
                                : "border-white/[0.06] text-grape-400 hover:border-white/[0.1] hover:text-white"
                            }`}
                          >
                            <Table2 className="h-3.5 w-3.5 inline mr-1" />
                            Table
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewChange("chart")}
                            aria-pressed={view === "chart"}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                              view === "chart"
                                ? "border-white/[0.15] bg-white/[0.06] text-white shadow-sm"
                                : "border-white/[0.06] text-grape-400 hover:border-white/[0.1] hover:text-white"
                            }`}
                          >
                            <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
                            Chart
                          </button>
                        </div>
                      )}
              </div>
                    {busy && !result?.rows ? (
                      <TableSkeleton rows={6} cols={result?.fields?.length || 4} />
                    ) : hasRows && result ? (
                      view === "chart" ? (
                        <ResultsChart fields={result.fields} rows={result.rows} />
                      ) : (
                        <ResultsTable fields={result.fields} rows={result.rows} />
                      )
                    ) : (
                      <EmptyState title="No results yet" message="Ask a question above and your answer will appear here." />
                    )}
                    {hasRows && (
                      <div className="mt-4">
                        <Button onClick={downloadCsv} variant="secondary" className="w-full sm:w-auto">
                          <Download className="h-4 w-4" />
                          Download as Spreadsheet
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* SQL (collapsible) */}
                {(result?.sql || busy) && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => setShowSql(!showSql)}
                      className="w-full flex items-center gap-2.5 px-4 sm:px-5 py-3 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
                    >
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-grape-400">
                        <Code2 className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-medium text-grape-300 flex-1">
                        {showSql ? "Hide" : "Show"} the database query (advanced)
                      </p>
                      <svg
                        className={`h-4 w-4 text-grape-400 transition-transform ${showSql ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showSql && (
                      <div className="px-4 sm:px-5 pb-4">
                        {busy && !result?.sql ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : result?.sql ? (
                          <CodeBlock code={result.sql} />
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Insights */}
                {hasRows && result && (
                  <InsightPanel
                    question={lastQuestion}
                    sql={result.sql}
                    fields={result.fields}
                    rows={result.rows}
                  />
                )}
              </section>
            </div>
          )}

      <ConnectDatabaseModal
        open={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={() => {
          setShowConnectModal(false);
          syncFromLocalStorage();
          toast.success("Data source connected!");
        }}
      />
      </>
  );
}
