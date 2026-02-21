"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Code2,
  Table2,
  BarChart3,
  Download,
  AlertCircle,
  Loader2,
  RotateCcw,
  Database,
  FileText,
  HelpCircle,
} from "lucide-react";
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

import DeepAnalysisPanel from "@/src/components/DeepAnalysisPanel";
import InsightPanel from "@/src/components/InsightPanel";
import ResultsChart from "@/src/components/ResultsChart";
import ResultsTable from "@/src/components/ResultsTable";
import DataSummaryPanel from "@/src/components/DataSummaryPanel";
import { toast } from "@/src/components/ui/Toast";
import ConnectDatabaseModal from "@/src/components/ConnectDatabaseModal";
import { fetchAccessibleDataSources } from "@/src/lib/datasourceClient";

type QueryResult = {
  sql: string;
  fields: string[];
  rows: Record<string, unknown>[];
};

type OffTopicPayload = {
  offTopic: true;
  reason: string;
  availableTables: string[];
};

type ConnectionIds = {
  datasourceId: string;
};

type ConnectedSource = {
  id: string;
  name?: string;
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
  const [analysisContext, setAnalysisContext] = useState<{ question: string; datasourceId: string } | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [offTopic, setOffTopic] = useState<OffTopicPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasDatasource, setHasDatasource] = useState(false);
  const [view, setView] = useState<"table" | "chart">("chart");
  const [showSql, setShowSql] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { thread, addTurn, clearThread } = useConversationThread();
  const [inputMode, setInputMode] = useState<"text" | "builder">("text");
  const [showConnectModal, setShowConnectModal] = useState(false);
  // Auto-summary: shown right after connecting a new data source
  const [justConnected, setJustConnected] = useState<ConnectedSource | null>(null);
  // Print section ref
  const printSectionRef = useRef<HTMLDivElement>(null);

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
      setOffTopic(null);
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

        // Off-topic: structured response, not an error
        if (payload.offTopic) {
          setOffTopic(payload as OffTopicPayload);
          setResult(null);
          setAnalysisContext(null);
          return;
        }

        if (!response.ok) {
          const message = payload?.error || "Request failed";
          throw new Error(message);
        }

        if (payload.analysisMode) {
          setResult(null);
          setAnalysisContext({ question: prompt, datasourceId });
          toast.success("Switching to deep analysis mode");
        } else {
          setAnalysisContext(null);
          setResult(payload);
          addTurn(prompt, payload.sql);
          toast.success("Query ran successfully");
        }
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

  const downloadPdf = useCallback(() => {
    window.print();
  }, []);

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
                <div className="text-center mb-2 no-print">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-grape-400 mb-3">Real-time intelligence</p>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
                    What do you want to know?
                  </h2>
                  <p className="text-sm text-grape-300 mt-2 max-w-md mx-auto">
                    Ask any business question in plain English — get instant insights, trends, and projections from your live data.
                  </p>
                </div>

                {/* Auto-summary panel — shown right after connecting a new data source */}
                {justConnected && (
                  <DataSummaryPanel
                    datasourceId={justConnected.id}
                    datasourceName={justConnected.name}
                    onAsk={(q) => {
                      setJustConnected(null);
                      onAsk(q);
                    }}
                    onDismiss={() => setJustConnected(null)}
                  />
                )}

                <Card className="no-print">
                  <CardBody>
                    <div className="mb-4 flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-white">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {hasDatasource ? "Ask anything about your business" : "Connect your data to get started"}
                          </p>
                          {hasDatasource ? (
                            <p className="text-xs text-grape-400 mt-0.5">Insights, trends, forecasts — just ask in plain English</p>
                          ) : (
                            <p className="text-xs text-grape-400 mt-0.5">Connect a database or upload a spreadsheet to begin</p>
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
                  <p className="font-semibold text-lg text-white mb-1">Connect your data to get started</p>
                  <p className="text-sm text-grape-400 mb-5 max-w-sm mx-auto">
                    Link your database and start getting real-time insights, forecasts, and answers instantly.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowConnectModal(true)}
                  >
                    <Database className="h-4 w-4" />
                    Connect a Database
                  </Button>
                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {["What were total sales last month?", "Project next quarter revenue", "Which customers are at risk of churning?"].map((ex) => (
                      <span key={ex} className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-grape-400 text-xs">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
                          setAnalysisContext(null);
                          setOffTopic(null);
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
                    Analyzing your data and generating insights... This usually takes a few seconds.
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

                {/* Off-topic response — question wasn't relevant to the data */}
                {offTopic && !busy && (
                  <Card className="no-print">
                    <CardBody>
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                          <HelpCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white mb-1">
                            That question isn&apos;t in your data
                          </p>
                          <p className="text-sm text-slate-300 leading-relaxed mb-3">
                            {offTopic.reason}
                          </p>
                          {offTopic.availableTables.length > 0 && (
                            <div>
                              <p className="text-xs text-grape-400 mb-2 uppercase tracking-wide font-medium">
                                Your data covers
                              </p>
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {offTopic.availableTables.map((t) => (
                                  <span
                                    key={t}
                                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-grape-300"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-grape-500">
                                Try asking something specific to the tables above, or click &quot;Switch Source&quot; to connect different data.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Results — wrapped in print section */}
                <div ref={printSectionRef} data-print-section>

                  {/* Print-only report header */}
                  <div className="print-report-header hidden">
                    <h1>Data Insights Report</h1>
                    <p>Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                    {lastQuestion && (
                      <p style={{ marginTop: 6, fontWeight: 600, color: "#111827" }}>
                        Question: {lastQuestion}
                      </p>
                    )}
                  </div>

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
                          <div className="flex flex-wrap items-center gap-1.5 no-print">
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
                        <div className="space-y-4 print-keep-together">
                          {/* Chart — always rendered in print, toggle on screen */}
                          <div className={view === "chart" ? "block" : "hidden print:block"}>
                            <ResultsChart fields={result.fields} rows={result.rows} />
                          </div>
                          {/* Table — always rendered in print */}
                          <div className={view === "table" ? "block" : "hidden print:block"}>
                            <ResultsTable fields={result.fields} rows={result.rows} />
                          </div>
                        </div>
                      ) : (
                        <EmptyState title="No results yet" message="Ask a business question above — insights, trends, and projections will appear here." />
                      )}
                      {hasRows && (
                        <div className="mt-4 flex flex-wrap gap-2 no-print">
                          <Button onClick={downloadCsv} variant="secondary" className="w-full sm:w-auto">
                            <Download className="h-4 w-4" />
                            Download as Spreadsheet
                          </Button>
                          <Button onClick={downloadPdf} variant="secondary" className="w-full sm:w-auto">
                            <FileText className="h-4 w-4" />
                            Download as PDF
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* SQL (collapsible) — hidden in print */}
                  {(result?.sql || busy) && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] no-print">
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

                  {/* Deep Analysis (predictive / prescriptive questions) */}
                  {analysisContext && (
                    <DeepAnalysisPanel
                      question={analysisContext.question}
                      datasourceId={analysisContext.datasourceId}
                    />
                  )}

                  {/* AI Insights (standard data queries) */}
                  {hasRows && result && !analysisContext && (
                    <InsightPanel
                      question={lastQuestion}
                      sql={result.sql}
                      fields={result.fields}
                      rows={result.rows}
                    />
                  )}

                </div>{/* end print section */}
              </section>
            </div>
          )}

      <ConnectDatabaseModal
        open={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={async () => {
          setShowConnectModal(false);
          syncFromLocalStorage();
          toast.success("Data source connected!");
          // Show auto-summary for the newly connected source
          try {
            const datasourceId = localStorage.getItem("datasourceId");
            if (datasourceId) {
              const { fetchAccessibleDataSources: fetchSources } = await import("@/src/lib/datasourceClient");
              const list = await fetchSources();
              const ds = list.find((s) => s.id === datasourceId);
              setJustConnected({ id: datasourceId, name: ds?.name });
            }
          } catch {
            // ignore
          }
        }}
      />
      </>
  );
}
