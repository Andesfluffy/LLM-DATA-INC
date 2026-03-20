"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useConversationThread } from "@/src/hooks/useConversationThread";
import { useFirebaseAuth } from "@/src/hooks/useFirebaseAuth";

import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/src/components/ui/Toast";
import QueryInputCard from "@/src/components/QueryInputCard";
import OffTopicCard from "@/src/components/OffTopicCard";
import ResultsCard from "@/src/components/ResultsCard";
import SqlCollapsible from "@/src/components/SqlCollapsible";
import PrintReportHeader from "@/src/components/PrintReportHeader";

const OnboardingWizard = dynamic(() => import("@/src/components/onboarding/OnboardingWizard"));
const MosaicHero = dynamic(() => import("@/src/components/landing/MosaicHero"));
const FeatureGrid = dynamic(() => import("@/src/components/landing/FeatureGrid"));
const HowItWorks = dynamic(() => import("@/src/components/landing/HowItWorks"));
const DataSummaryPanel = dynamic(() => import("@/src/components/DataSummaryPanel"));
const DeepAnalysisPanel = dynamic(() => import("@/src/components/DeepAnalysisPanel"));
const InsightPanel = dynamic(() => import("@/src/components/InsightPanel"));
const SavedQueriesPanel = dynamic(() => import("@/components/SavedQueriesPanel"));
const ConnectDatabaseModal = dynamic(() => import("@/src/components/ConnectDatabaseModal"));

import { fetchAccessibleDataSources } from "@/src/lib/datasourceClient";
import { getAuthHeaders } from "@/lib/uploadUtils";
import { saveQuery, removeSavedQuery, isQuerySaved, getSavedQueries } from "@/lib/savedQueries";

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
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [currentQuestionSaved, setCurrentQuestionSaved] = useState(false);
  const [isActivatingDemo, setIsActivatingDemo] = useState(false);
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

  // Pre-fill question from URL ?q= param (for shared links)
  useEffect(() => {
    if (!user) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    window.history.replaceState({}, "", window.location.pathname);
    const t = setTimeout(() => onAsk(q), 300);
    return () => clearTimeout(t);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = useCallback(() => {
    if (!lastQuestion) return;
    const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(lastQuestion)}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Share link copied to clipboard!")).catch(() => toast.error("Could not copy link"));
  }, [lastQuestion]);

  const handleToggleSave = useCallback(() => {
    if (!lastQuestion) return;
    if (currentQuestionSaved) {
      const items = getSavedQueries();
      const found = items.find((q) => q.question === lastQuestion);
      if (found) { removeSavedQuery(found.id); setSavedRefreshKey((k) => k + 1); }
      setCurrentQuestionSaved(false);
      toast.success("Removed from saved queries");
    } else {
      saveQuery(lastQuestion);
      setCurrentQuestionSaved(true);
      setSavedRefreshKey((k) => k + 1);
      toast.success("Saved!");
    }
  }, [lastQuestion, currentQuestionSaved]);

  const handleActivateDemo = useCallback(async () => {
    setIsActivatingDemo(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/demo/activate", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to activate demo");
      localStorage.setItem("datasourceId", data.id);
      syncFromLocalStorage();
      setShowOnboarding(false);
      toast.success(data.alreadyExisted ? "Demo data loaded!" : "Sample data connected! Try asking a question.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load demo data");
    } finally {
      setIsActivatingDemo(false);
    }
  }, [syncFromLocalStorage]);

  const handleClearThread = useCallback(() => {
    clearThread();
    setResult(null);
    setAnalysisContext(null);
    setOffTopic(null);
    setError(null);
    setLastQuestion("");
  }, [clearThread]);

  const onAsk = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt) return;

      setBusy(true);
      setError(null);
      setResult(null);
      setOffTopic(null);
      setLastQuestion(prompt);
      setCurrentQuestionSaved(isQuerySaved(prompt));

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
        <div className="py-8 px-2 sm:py-12 md:px-4 md:py-14">
          <OnboardingWizard onComplete={handleOnboardingComplete} onActivateDemo={handleActivateDemo} />
        </div>
      ) : (
        <div className="space-y-12 sm:space-y-16 md:space-y-18 lg:space-y-20">
          <div className="divider-gradient" />
          <FeatureGrid brandName="Data Vista" />
          <div className="divider-gradient" />
          <HowItWorks brandName="Data Vista" />

          {/* Ask Section */}
          <section id="ask" className="scroll-mt-24 space-y-4 sm:space-y-6 md:space-y-7 lg:space-y-8">

            {/* Section heading — hidden on mobile to save space */}
            <div className="hidden sm:block text-center mb-2 no-print">
              <p className="text-[11px] uppercase tracking-[0.2em] text-grape-300 mb-3">Real-time intelligence</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
                What do you want to know?
              </h2>
              <p className="text-sm text-grape-300 mt-2 max-w-md mx-auto">
                Ask any business question in plain English — get instant insights, trends, and projections from your live data.
              </p>
            </div>

            {/* Persistent Data Summary Panel */}
            {hasDatasource && activeDatasourceId && (
              <DataSummaryPanel
                key={activeDatasourceId}
                datasourceId={activeDatasourceId}
                datasourceName={activeDatasourceName}
                onAsk={(q) => { window.scrollTo({ top: 0, behavior: "smooth" }); onAsk(q); }}
              />
            )}

            {/* Query Input */}
            <QueryInputCard
              hasDatasource={hasDatasource}
              inputMode={inputMode}
              setInputMode={setInputMode}
              threadLength={thread.length}
              onClearThread={handleClearThread}
              onAsk={onAsk}
              busy={busy}
              error={error}
              isActivatingDemo={isActivatingDemo}
              onActivateDemo={handleActivateDemo}
              onConnectClick={() => setShowConnectModal(true)}
            />

            {/* Off-topic response */}
            {offTopic && !busy && <OffTopicCard offTopic={offTopic} />}

            {/* Results (print section) */}
            <div ref={printSectionRef} data-print-section>
              <PrintReportHeader lastQuestion={lastQuestion} />

              <ResultsCard
                result={result}
                busy={busy}
                lastQuestion={lastQuestion}
                currentQuestionSaved={currentQuestionSaved}
                onDownloadCsv={downloadCsv}
                onDownloadPdf={downloadPdf}
                onShare={handleShare}
                onToggleSave={handleToggleSave}
              />

              <SqlCollapsible sql={result?.sql} busy={busy} />

              {/* AI Insights */}
              {hasRows && result && (
                <InsightPanel
                  question={lastQuestion}
                  sql={result.sql}
                  fields={result.fields}
                  rows={result.rows}
                />
              )}

              {/* Deep Analysis */}
              {(analysisContext || (hasRows && result && activeDatasourceId)) && (
                <DeepAnalysisPanel
                  question={analysisContext?.question ?? lastQuestion}
                  datasourceId={analysisContext?.datasourceId ?? activeDatasourceId!}
                />
              )}
            </div>

            {/* Saved Queries */}
            <SavedQueriesPanel
              refreshKey={savedRefreshKey}
              onRerun={(q) => { window.scrollTo({ top: 0, behavior: "smooth" }); onAsk(q); }}
            />

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
