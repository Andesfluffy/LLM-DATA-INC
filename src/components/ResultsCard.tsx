"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Table2,
  BarChart3,
  LineChart,
  Download,
  FileText,
  Share2,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import dynamic from "next/dynamic";
import Button from "@/src/components/Button";
import Card, { CardBody } from "@/src/components/Card";
import EmptyState from "@/src/components/EmptyState";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import type { ChartDisplayType } from "@/src/components/Chart";

const ResultsChart = dynamic(() => import("@/src/components/ResultsChart"));
const ResultsTable = dynamic(() => import("@/src/components/ResultsTable"));

type QueryResult = {
  sql: string;
  fields: string[];
  rows: Record<string, unknown>[];
};

type ResultsCardProps = {
  result: QueryResult | null;
  busy: boolean;
  lastQuestion: string;
  currentQuestionSaved: boolean;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
  onShare: () => void;
  onToggleSave: () => void;
};

export default function ResultsCard({
  result,
  busy,
  lastQuestion,
  currentQuestionSaved,
  onDownloadCsv,
  onDownloadPdf,
  onShare,
  onToggleSave,
}: ResultsCardProps) {
  const [view, setView] = useState<"table" | "chart">("chart");
  const [chartType, setChartType] = useState<ChartDisplayType>("auto");

  const hasRows = useMemo(() => Boolean(result?.rows && result.rows.length > 0), [result]);
  const handleViewChange = useCallback((next: "table" | "chart") => setView(next), []);

  // Reset chart type when result changes
  const resultKey = result?.sql ?? "";

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-white">
              <Table2 className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-white">Results</p>
            {hasRows && result && (
              <span className="text-xs text-grape-300">
                ({result.rows.length} {result.rows.length === 1 ? "row" : "rows"})
              </span>
            )}
          </div>
          {hasRows && (
            <div className="flex items-center gap-1.5 flex-wrap no-print">
              {/* View toggle */}
              {(["chart", "table"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleViewChange(v)}
                  aria-pressed={view === v}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                    view === v
                      ? "border-white/[0.15] bg-white/[0.06] text-white"
                      : "border-white/[0.06] text-grape-300 hover:border-white/[0.1] hover:text-white"
                  }`}
                >
                  {v === "chart"
                    ? <><BarChart3 className="h-3.5 w-3.5" /><span>Chart</span></>
                    : <><Table2 className="h-3.5 w-3.5" /><span>Table</span></>}
                </button>
              ))}
              {/* Chart type selector — only visible when chart view is active */}
              {view === "chart" && (
                <div className="flex items-center gap-1 border-l border-white/[0.06] pl-1.5">
                  {(["auto", "bar", "line"] as const).map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      title={`${ct === "auto" ? "Auto-detect" : ct === "bar" ? "Bar chart" : "Line chart"}`}
                      onClick={() => setChartType(ct)}
                      className={`flex items-center justify-center rounded-lg border p-1.5 transition-all ${
                        chartType === ct
                          ? "border-white/[0.15] bg-white/[0.06] text-white"
                          : "border-transparent text-grape-300 hover:text-grape-200"
                      }`}
                    >
                      {ct === "line"
                        ? <LineChart className="h-3.5 w-3.5" />
                        : <BarChart3 className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {busy && !result?.rows ? (
          <TableSkeleton rows={5} cols={result?.fields?.length || 4} />
        ) : hasRows && result ? (
          <div className="space-y-4 print-keep-together">
            <div className={view === "chart" ? "block" : "hidden print:block"}>
              <ResultsChart fields={result.fields} rows={result.rows} chartType={chartType} />
            </div>
            <div className={view === "table" ? "block" : "hidden print:block"}>
              <ResultsTable fields={result.fields} rows={result.rows} />
            </div>
          </div>
        ) : (
          <EmptyState
            title="No results yet"
            message="Type a question in the search box above to query your data. Charts and tables will appear here automatically."
          />
        )}

        {hasRows && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap no-print">
            <Button onClick={onDownloadCsv} variant="secondary" size="sm" className="w-full sm:w-auto sm:text-sm">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span> CSV
            </Button>
            <Button onClick={onDownloadPdf} variant="secondary" size="sm" className="w-full sm:w-auto sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button onClick={onShare} variant="secondary" size="sm" className="w-full sm:w-auto sm:text-sm" title="Copy a shareable link pre-filled with this question">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button onClick={onToggleSave} variant="secondary" size="sm" className="w-full sm:w-auto sm:text-sm" title={currentQuestionSaved ? "Remove from saved queries" : "Save this question"}>
              {currentQuestionSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-400" /> : <Bookmark className="h-3.5 w-3.5" />}
              {currentQuestionSaved ? "Saved" : "Save"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
