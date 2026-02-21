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

export default function HomePage() {
  const { user, loading } = useFirebaseAuth();
  const prevUser = useRef(user);

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
  const [activeDatasourceId, setActiveDatasourceId] = useState<string | null>(null);
  const [activeDatasourceName, setActiveDatasourceName] = useState<string | undefined>(undefined);
  const [view, setView] = useState<"table" | "chart">("chart");
  const [showSql, setShowSql] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { thread, addTurn, clearThread } = useConversationThread();
  const [inputMode, setInputMode] = useState<"text" | "builder">("text");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const printSectionRef = useRef<HTMLDivElement>(null);

  const syncFromLocalStorage = useCallback(() => {
    try {
      const id = localStorage.getItem("datasourceId");
      setHasDatasource(Boolean(id));
      setActiveDatasourceId(id);
    } catch {
      setHasDatasource(false);
      setActiveDatasourceId(null);
    }
  }, []);

  const resolveConnectionIds = useCallback(async (): Promise<ConnectionIds | null> => {
    try {
      let datasourceId = localStorage.getItem("datasourceId");
      if (datasourceId) return { datasourceId };

      const list = await fetchAccessibleDataSources();
      if (list.length > 0) {
        const first = list[0]!;
        datasourceId = first.id;
        localStorage.setItem("datasourceId", datasourceId);
      }
      if (datasourceId) return { datasourceId };
    } catch (err) {
      console.error("Failed to resolve data source ids", err);
    }
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try { await resolveConnectionIds(); }
      finally { if (!cancelled) syncFromLocalStorage(); }
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

  useEffect(() => {
    const datasourceId = localStorage.getItem("datasourceId");
    setShowOnboarding(!datasourceId);
    setOnboardingChecked(true);
  }, [user]);

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

        if (payload.offTopic) {
          setOffTopic(payload as OffTopicPayload);
          setResult(null);
          setAnalysisContext(null);
          return;
        }

        if (!response.ok) throw new Error(payload?.error || "Request failed");

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
      const s = String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const row of result.rows) {
      lines.push(headers.map((f) => escapeCell((row as Record<string, unknown>)[f])).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const downloadPdf = useCallback(() => { window.print(); }, []);

  const hasRows = useMemo(() => Boolean(result?.rows && result.rows.length > 0), [result]);
  const handleViewChange = useCallback((next: "table" | "chart") => setView(next), []);

  if (loading) {
    return (
      <div className="space-y-6 py-12 px-4">
        <Skeleton className="mx-auto h-10 w-2/3 rounded-xl" />
        <Skeleton className="mx-auto h-5 w-1/2 rounded-lg" />
        <Skeleton className="mx-auto h-40 w-full max-w-4xl rounded-2xl" />
      </div>
    );
  }

  if (!user) return <MosaicHero />;

  return (
    <>
      {showOnboarding && onboardingChecked ? (
        <div className="py-8 px-2 sm:py-12">
          <OnboardingWizard onComplete={handleOnboardingComplete} />
        </div>
      ) : (
        <div className="space-y-12 sm:space-y-16 lg:space-y-20">
          <div className="divider-gradient" />
          <FeatureGrid brandName="Data Vista" />
          <div className="divider-gradient" />
          <HowItWorks brandName="Data Vista" />

          {/* Ask Section */}
          <section id="ask" className="scroll-mt-24 space-y-4 sm:space-y-6">

            {/* Section heading — hidden on mobile to save space */}
            <div className="hidden sm:block text-center mb-2 no-print">
              <p className="text-[11px] uppercase tracking-[0.2em] text-grape-400 mb-3">Real-time intelligence</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
                What do you want to know?
              </h2>
              <p className="text-sm text-grape-300 mt-2 max-w-md mx-auto">
                Ask any business question in plain English — get instant insights, trends, and projections from your live data.
              </p>
            </div>

            {/* ── Persistent Data Summary Panel ── */}
            {hasDatasource && activeDatasourceId && (
              <DataSummaryPanel
                key={activeDatasourceId}
                datasourceId={activeDatasourceId}
                datasourceName={activeDatasourceName}
                onAsk={(q) => { window.scrollTo({ top: 0, behavior: "smooth" }); onAsk(q); }}
              />
            )}

            {/* ── Query Input Card ── */}
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
                      <p className="text-xs text-grape-400 mt-0.5 leading-tight">
                        {hasDatasource
                          ? "Insights, trends, forecasts — plain English"
                          : "Connect a database or upload a spreadsheet"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={hasDatasource ? "secondary" : "primary"}
                    onClick={() => setShowConnectModal(true)}
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
                      <Database className="h-5 w-5 text-grape-400" />
                    </div>
                    <p className="font-semibold text-base text-white mb-1">Connect your data to get started</p>
                    <p className="text-sm text-grape-400 mb-4 max-w-xs mx-auto">
                      Link your database and start getting real-time insights instantly.
                    </p>
                    <Button variant="primary" onClick={() => setShowConnectModal(true)}>
                      <Database className="h-4 w-4" />
                      Connect a Database
                    </Button>
                    <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2 items-center justify-center">
                      {["Total sales last month?", "Next quarter revenue?", "Customers at risk?"].map((ex) => (
                        <span key={ex} className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-grape-400 text-xs">
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
                            : "border-white/[0.06] text-grape-400 hover:text-grape-300"
                        }`}
                      >
                        {mode === "text" ? "Type a question" : "Use the builder"}
                      </button>
                    ))}
                  </div>
                )}

                {inputMode === "text" ? (
                  <>
                    {thread.length > 0 && (
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-grape-300">
                          Follow-up · {thread.length} {thread.length === 1 ? "turn" : "turns"}
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
                          New
                        </button>
                      </div>
                    )}
                    <QueryInput onSubmit={onAsk} threadLength={thread.length} />
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
                    <p role="alert" className="text-sm text-red-300" aria-live="polite">{error}</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* ── Off-topic response ── */}
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
                        <>
                          <p className="text-xs text-grape-400 mb-2 uppercase tracking-wide font-medium">
                            Your data covers
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {offTopic.availableTables.map((t) => (
                              <span key={t} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-grape-300">
                                {t}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-grape-500">
                            Ask about the tables above, or switch your data source.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* ── Results (print section) ── */}
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
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-white">
                        <Table2 className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-white">Results</p>
                      {hasRows && result && (
                        <span className="text-xs text-grape-400">
                          ({result.rows.length} {result.rows.length === 1 ? "row" : "rows"})
                        </span>
                      )}
                    </div>
                    {hasRows && (
                      <div className="flex items-center gap-1.5 no-print">
                        {(["chart", "table"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleViewChange(v)}
                            aria-pressed={view === v}
                            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                              view === v
                                ? "border-white/[0.15] bg-white/[0.06] text-white"
                                : "border-white/[0.06] text-grape-400 hover:border-white/[0.1] hover:text-white"
                            }`}
                          >
                            {v === "chart"
                              ? <><BarChart3 className="h-3.5 w-3.5" /><span>Chart</span></>
                              : <><Table2 className="h-3.5 w-3.5" /><span>Table</span></>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {busy && !result?.rows ? (
                    <TableSkeleton rows={5} cols={result?.fields?.length || 4} />
                  ) : hasRows && result ? (
                    <div className="space-y-4 print-keep-together">
                      <div className={view === "chart" ? "block" : "hidden print:block"}>
                        <ResultsChart fields={result.fields} rows={result.rows} />
                      </div>
                      <div className={view === "table" ? "block" : "hidden print:block"}>
                        <ResultsTable fields={result.fields} rows={result.rows} />
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No results yet"
                      message="Ask a question above — insights and charts will appear here."
                    />
                  )}

                  {hasRows && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-2 no-print">
                      <Button onClick={downloadCsv} variant="secondary" className="w-full sm:w-auto">
                        <Download className="h-4 w-4" />
                        Download Spreadsheet
                      </Button>
                      <Button onClick={downloadPdf} variant="secondary" className="w-full sm:w-auto">
                        <FileText className="h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* SQL collapsible */}
              {(result?.sql || busy) && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] no-print">
                  <button
                    type="button"
                    onClick={() => setShowSql(!showSql)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
                  >
                    <div className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.04] text-grape-400">
                      <Code2 className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-medium text-grape-300 flex-1">
                      {showSql ? "Hide" : "Show"} query (advanced)
                    </p>
                    <svg className={`h-4 w-4 text-grape-400 transition-transform ${showSql ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showSql && (
                    <div className="px-4 pb-4">
                      {result?.sql ? <CodeBlock code={result.sql} /> : null}
                    </div>
                  )}
                </div>
              )}

              {/* Deep Analysis */}
              {analysisContext && (
                <DeepAnalysisPanel
                  question={analysisContext.question}
                  datasourceId={analysisContext.datasourceId}
                />
              )}

              {/* AI Insights */}
              {hasRows && result && !analysisContext && (
                <InsightPanel
                  question={lastQuestion}
                  sql={result.sql}
                  fields={result.fields}
                  rows={result.rows}
                />
              )}
            </div>
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
          // Resolve name for the newly connected source
          try {
            const id = localStorage.getItem("datasourceId");
            if (id) {
              const list = await fetchAccessibleDataSources();
              const ds = list.find((s) => s.id === id);
              setActiveDatasourceName(ds?.name);
            }
          } catch { /* ignore */ }
        }}
      />
    </>
  );
}
