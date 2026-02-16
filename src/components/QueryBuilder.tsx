"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import Button from "@/src/components/Button";
import { useSchemaInfo } from "@/src/hooks/useSchemaInfo";

type QueryBuilderProps = {
  onSubmit: (question: string) => void;
};

const TIME_FILTERS = [
  { label: "All time", value: "" },
  { label: "Last 7 days", value: "last 7 days" },
  { label: "Last 30 days", value: "last 30 days" },
  { label: "This month", value: "this month" },
  { label: "This year", value: "this year" },
  { label: "Last year", value: "last year" },
];

export default function QueryBuilder({ onSubmit }: QueryBuilderProps) {
  const { tables, loading, error } = useSchemaInfo();
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [selectedDimension, setSelectedDimension] = useState("");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("");

  const currentTable = useMemo(
    () => tables.find((t) => t.name === selectedTable),
    [tables, selectedTable]
  );

  const numericColumns = useMemo(
    () => currentTable?.columns.filter((c) => c.isNumeric) || [],
    [currentTable]
  );

  const dimensionColumns = useMemo(
    () => currentTable?.columns.filter((c) => !c.isNumeric) || [],
    [currentTable]
  );

  const temporalColumns = useMemo(
    () => currentTable?.columns.filter((c) => c.isTemporal) || [],
    [currentTable]
  );

  const metricOptions = useMemo(() => {
    const opts = [{ label: "Count of rows", value: "count of rows" }];
    for (const col of numericColumns) {
      opts.push({ label: `Sum of ${col.name}`, value: `the sum of ${col.name}` });
      opts.push({ label: `Average ${col.name}`, value: `the average ${col.name}` });
    }
    return opts;
  }, [numericColumns]);

  const buildQuestion = useCallback(() => {
    if (!selectedTable || !selectedMetric) return "";
    let q = `Show me ${selectedMetric} from ${selectedTable}`;
    if (selectedDimension) q += ` grouped by ${selectedDimension}`;
    if (selectedTimeFilter) q += ` for the ${selectedTimeFilter}`;
    return q;
  }, [selectedTable, selectedMetric, selectedDimension, selectedTimeFilter]);

  const question = buildQuestion();

  const handleSubmit = useCallback(() => {
    if (question) onSubmit(question);
  }, [question, onSubmit]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-sm text-grape-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your database structure...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-grape-400 text-sm">
        <p>Couldn&apos;t load your database structure. Please check your data source connection.</p>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center py-6 text-grape-400 text-sm">
        <p>No tables found. Connect a data source in Settings first.</p>
      </div>
    );
  }

  const selectClasses =
    "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/[0.15] focus:outline-none focus:ring-1 focus:ring-white/[0.1] transition";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-grape-300" />
        <p className="text-sm font-medium text-white">Build your question step by step</p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-4">
        {/* Sentence builder */}
        <div className="flex flex-col gap-2 text-sm text-grape-200 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="font-medium text-white sm:whitespace-nowrap">Show me</span>

          {/* Metric */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className={`${selectClasses} w-full sm:w-auto sm:min-w-[180px]`}
            disabled={!selectedTable}
          >
            <option value="">-- what to measure --</option>
            {metricOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <span className="font-medium text-white sm:whitespace-nowrap">from</span>

          {/* Table */}
          <select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setSelectedMetric("");
              setSelectedDimension("");
              setSelectedTimeFilter("");
            }}
            className={`${selectClasses} w-full sm:w-auto sm:min-w-[160px]`}
          >
            <option value="">-- pick a table --</option>
            {tables.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>

          {dimensionColumns.length > 0 && (
            <>
              <span className="font-medium text-white sm:whitespace-nowrap">grouped by</span>
              <select
                value={selectedDimension}
                onChange={(e) => setSelectedDimension(e.target.value)}
                className={`${selectClasses} w-full sm:w-auto sm:min-w-[160px]`}
              >
                <option value="">-- none (optional) --</option>
                {dimensionColumns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </>
          )}

          {temporalColumns.length > 0 && (
            <>
              <span className="font-medium text-white sm:whitespace-nowrap">for</span>
              <select
                value={selectedTimeFilter}
                onChange={(e) => setSelectedTimeFilter(e.target.value)}
                className={`${selectClasses} w-full sm:w-auto sm:min-w-[140px]`}
              >
                {TIME_FILTERS.map((tf) => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Preview */}
        {question && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-grape-400 mb-1">Your question:</p>
            <p className="text-sm text-white font-medium">&ldquo;{question}&rdquo;</p>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!question}
        variant="primary"
        className="w-full sm:w-auto"
      >
        Ask this question
      </Button>
    </div>
  );
}
