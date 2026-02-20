"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Sparkles,
  Database,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Zap,
  Upload,
} from "lucide-react";
import Card, { CardBody } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import ProgressBar from "./ProgressBar";
import { toast } from "@/src/components/ui/Toast";
import { isExcelFileName, listExcelSheets } from "@/src/lib/excelSheets";
import { uploadCsvFile, getAuthHeaders } from "@/lib/uploadUtils";

type OnboardingWizardProps = {
  onComplete: () => void;
};

type Step = "welcome" | "connect" | "test" | "first-query" | "complete";
type ConnectorType = "csv" | "sqlite" | "postgres" | "mysql";

type FormState = {
  type: ConnectorType;
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};

const STEPS: Step[] = ["welcome", "connect", "test", "first-query", "complete"];
const STEP_LABELS = [
  "Welcome",
  "Connect Data",
  "Verify",
  "Try It Out",
  "Ready!",
];

const DEFAULT_FORM: FormState = {
  type: "csv",
  name: "Spreadsheet Upload",
  host: "localhost",
  port: "5432",
  database: "postgres",
  user: "postgres",
  password: "",
};

const PORT_BY_TYPE: Record<ConnectorType, string> = {
  csv: "",
  sqlite: "",
  postgres: "5432",
  mysql: "3306",
};

export default function OnboardingWizard({
  onComplete,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [testMsg, setTestMsg] = useState("");
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryBusy, setQueryBusy] = useState(false);
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [sheetBusy, setSheetBusy] = useState(false);

  const isSpreadsheet = form.type === "csv";
  const isSqlite = form.type === "sqlite";

  const buildSavePayload = useCallback(() => {
    if (form.type === "csv") return null;
    if (form.type === "sqlite") {
      return {
        type: "sqlite",
        name: form.name || "SQLite",
        database: form.database,
      };
    }

    return {
      type: form.type,
      name: form.name,
      host: form.host,
      ...(form.port.trim() ? { port: Number(form.port) } : {}),
      database: form.database,
      user: form.user,
      ...(form.password ? { password: form.password } : {}),
    };
  }, [form]);

  const buildTestPayload = useCallback(() => {
    if (form.type === "csv") return null;
    if (form.type === "sqlite") {
      return { type: "sqlite", database: form.database };
    }

    return {
      type: form.type,
      host: form.host,
      ...(form.port.trim() ? { port: Number(form.port) } : {}),
      database: form.database,
      user: form.user,
      ...(form.password ? { password: form.password } : {}),
    };
  }, [form]);

  const skipOnboarding = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const uploadSpreadsheet = useCallback(async () => {
    if (!csvFile) throw new Error("Please choose a CSV or Excel file.");

    const uploadPayload = await uploadCsvFile(
      csvFile,
      form.name || csvFile.name,
      selectedSheet,
    );

    if (uploadPayload.id) {
      localStorage.setItem("datasourceId", uploadPayload.id);
    }

    return uploadPayload;
  }, [csvFile, form.name, selectedSheet]);

  const handleSpreadsheetSelected = useCallback(async (file: File | null) => {
    setCsvFile(file);
    setSheetOptions([]);
    setSelectedSheet("");
    if (!file || !isExcelFileName(file.name)) return;

    setSheetBusy(true);
    try {
      const sheets = await listExcelSheets(file);
      setSheetOptions(sheets);
      if (sheets.length > 0) {
        setSelectedSheet(sheets[0]!);
      }
    } catch {
      toast.error(
        "Could not read Excel sheets. You can still upload and use the first sheet.",
      );
    } finally {
      setSheetBusy(false);
    }
  }, []);

  const handleSaveAndTest = useCallback(async () => {
    setSaving(true);
    setTesting(false);
    setTestOk(null);
    setTestMsg("");

    try {
      if (isSpreadsheet) {
        await uploadSpreadsheet();
        setStep("test");
        setTestOk(true);
        setTestMsg("Spreadsheet uploaded and connected.");
        return;
      }

      const savePayload = buildSavePayload();
      if (!savePayload) throw new Error("Missing connection details.");

      const headers = await getAuthHeaders();
      const saveRes = await fetch("/api/datasources/save", {
        method: "POST",
        headers,
        body: JSON.stringify(savePayload),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData?.error || "Save failed");

      if (saveData.id) {
        localStorage.setItem("datasourceId", saveData.id);
      }

      setStep("test");
      setTesting(true);

      const testPayload = buildTestPayload();
      if (!testPayload) throw new Error("Missing test configuration.");

      const testRes = await fetch("/api/datasources/test", {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
      });
      const testData = await testRes.json();
      if (!testRes.ok) {
        setTestOk(false);
        setTestMsg(testData?.error || "Connection failed");
      } else {
        setTestOk(true);
        setTestMsg(`Connected in ${testData.ms}ms`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed");
    } finally {
      setSaving(false);
      setTesting(false);
    }
  }, [
    buildSavePayload,
    buildTestPayload,
    isSpreadsheet,
    uploadSpreadsheet,
  ]);

  const handleDemoDb = useCallback(() => {
    toast.error("Demo database is not available. Please connect your own data source.");
  }, []);

  const handleFirstQuery = useCallback(async () => {
    if (!query.trim()) return;
    setQueryBusy(true);
    try {
      const datasourceId = localStorage.getItem("datasourceId");
      if (!datasourceId) throw new Error("No data source configured");

      const headers = await getAuthHeaders();
      const res = await fetch("/api/query", {
        method: "POST",
        headers,
        body: JSON.stringify({ datasourceId, question: query.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Query failed");
      setQueryResult(payload);
      toast.success("Query ran successfully");
    } catch (err: any) {
      toast.error(err?.message || "Query failed");
    } finally {
      setQueryBusy(false);
    }
  }, [query]);

  const completeOnboarding = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const currentStepIndex = STEPS.indexOf(step);

  const typeLabel = useMemo(() => {
    if (isSpreadsheet) return "Spreadsheet";
    if (isSqlite) return "SQLite";
    return form.type === "mysql" ? "MySQL" : "PostgreSQL";
  }, [form.type, isSpreadsheet, isSqlite]);

  const update = (k: keyof FormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <ProgressBar steps={STEP_LABELS} currentStep={currentStepIndex} />

      {step === "welcome" && (
        <Card>
          <CardBody>
            <div className="text-center space-y-6 py-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-violet-500/20 text-accent mx-auto">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Welcome to Data Vista
                </h1>
                <p className="text-slate-400 mt-2 max-w-md mx-auto">
                  Connect a spreadsheet or database and ask questions in plain
                  English.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-lg mx-auto">
                {[
                  {
                    icon: Upload,
                    title: "Upload",
                    desc: "Drop CSV or Excel to get started quickly",
                  },
                  {
                    icon: Zap,
                    title: "Ask",
                    desc: "Type any question in everyday language",
                  },
                  {
                    icon: Sparkles,
                    title: "Insights",
                    desc: "See answers and charts instantly",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="rounded-xl border border-slate-700/30 bg-[#0F172A]/40 p-4"
                  >
                    <Icon className="h-5 w-5 text-accent mb-2" />
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={() => setStep("connect")} variant="primary">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleDemoDb}
                  variant="secondary"
                  disabled={saving}
                >
                  Try Demo Data
                </Button>
                <button
                  onClick={skipOnboarding}
                  className="text-xs text-slate-500 hover:text-slate-300 transition"
                >
                  Skip setup
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "connect" && (
        <Card>
          <CardBody>
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Connect Your Data
                  </h2>
                  <p className="text-sm text-slate-400">
                    Choose a data source type, then connect in one step.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { type: "csv" as ConnectorType, label: "Spreadsheet" },
                  { type: "sqlite" as ConnectorType, label: "SQLite" },
                  { type: "postgres" as ConnectorType, label: "PostgreSQL" },
                  { type: "mysql" as ConnectorType, label: "MySQL" },
                ].map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        type: option.type,
                        port: PORT_BY_TYPE[option.type],
                        name:
                          option.type === "csv"
                            ? "Spreadsheet Upload"
                            : option.type === "sqlite"
                              ? "Local SQLite"
                              : prev.name,
                      }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      form.type === option.type
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-slate-600 text-slate-400"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Input
                label="Connection Name"
                value={form.name}
                onChange={(e) =>
                  update("name", (e.target as HTMLInputElement).value)
                }
                placeholder={
                  isSpreadsheet ? "My Spreadsheet" : "Primary Data Source"
                }
              />

              {isSpreadsheet ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">
                    Spreadsheet File
                  </label>
                  <div className="rounded-lg border border-dashed border-slate-600 bg-[#0B0F12] p-4">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleSpreadsheetSelected(file);
                      }}
                      className="block w-full text-sm text-slate-300"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      {csvFile
                        ? `Selected: ${csvFile.name}`
                        : "Upload CSV, XLSX, or XLS (max 10MB)."}
                    </p>
                    {sheetBusy && (
                      <p className="mt-2 text-xs text-slate-500">
                        Reading workbook sheets...
                      </p>
                    )}
                    {!sheetBusy && sheetOptions.length > 1 && (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-slate-300">
                          Excel Sheet
                        </label>
                        <select
                          value={selectedSheet}
                          onChange={(e) => setSelectedSheet(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-[#0B0F12] px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          {sheetOptions.map((sheet) => (
                            <option key={sheet} value={sheet}>
                              {sheet}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!sheetBusy &&
                      sheetOptions.length === 1 &&
                      selectedSheet && (
                        <p className="mt-2 text-xs text-slate-500">
                          Using sheet: {selectedSheet}
                        </p>
                      )}
                  </div>
                </div>
              ) : isSqlite ? (
                <Input
                  label="Database File Path"
                  value={form.database}
                  onChange={(e) =>
                    update("database", (e.target as HTMLInputElement).value)
                  }
                  placeholder="/path/to/database.db or :memory:"
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Input
                        label="Host"
                        value={form.host}
                        onChange={(e) =>
                          update("host", (e.target as HTMLInputElement).value)
                        }
                        placeholder="db.example.com"
                      />
                    </div>
                    <Input
                      label="Port"
                      value={form.port}
                      onChange={(e) =>
                        update("port", (e.target as HTMLInputElement).value)
                      }
                      placeholder={form.type === "mysql" ? "3306" : "5432"}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Database"
                      value={form.database}
                      onChange={(e) =>
                        update("database", (e.target as HTMLInputElement).value)
                      }
                    />
                    <Input
                      label="User"
                      value={form.user}
                      onChange={(e) =>
                        update("user", (e.target as HTMLInputElement).value)
                      }
                    />
                  </div>
                  <Input
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      update("password", (e.target as HTMLInputElement).value)
                    }
                  />
                </>
              )}

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button
                  onClick={handleSaveAndTest}
                  disabled={saving || (isSpreadsheet && !csvFile)}
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isSpreadsheet ? "Uploading..." : "Connecting..."}
                    </>
                  ) : (
                    <>
                      {isSpreadsheet ? "Upload & Continue" : "Connect & Test"}{" "}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <button
                  onClick={() => setStep("welcome")}
                  className="text-sm text-slate-500 hover:text-slate-300 sm:ml-1"
                >
                  Back
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "test" && (
        <Card>
          <CardBody>
            <div className="text-center space-y-6 py-6">
              {testing ? (
                <>
                  <Loader2 className="h-12 w-12 text-accent animate-spin mx-auto" />
                  <p className="text-slate-400">Testing connection...</p>
                </>
              ) : testOk ? (
                <>
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Connected Successfully
                    </h2>
                    <p className="text-sm text-emerald-400 mt-1">
                      {testMsg || `${typeLabel} source is ready`}
                    </p>
                  </div>
                  <Button
                    onClick={() => setStep("first-query")}
                    variant="primary"
                  >
                    Try Your First Query <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mx-auto">
                    <Database className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Connection Failed
                    </h2>
                    <p className="text-sm text-rose-400 mt-1">{testMsg}</p>
                  </div>
                  <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                    <Button
                      onClick={() => setStep("connect")}
                      variant="secondary"
                      className="w-full sm:w-auto"
                    >
                      Go Back & Fix
                    </Button>
                    <button
                      onClick={() => setStep("first-query")}
                      className="text-sm text-slate-500 hover:text-slate-300"
                    >
                      Skip
                    </button>
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {step === "first-query" && (
        <Card>
          <CardBody>
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Ask Your First Question
                  </h2>
                  <p className="text-sm text-slate-400">
                    Start with a simple prompt and Data Vista will do the rest.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "What data do I have?",
                  "Tell me what this dataset is about",
                  "Show me the first 10 rows",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-[#0B0F12] px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                placeholder="e.g., How many records are in this data source?"
              />

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button
                  onClick={handleFirstQuery}
                  disabled={queryBusy || !query.trim()}
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  {queryBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Running...
                    </>
                  ) : (
                    "Run Query"
                  )}
                </Button>
              </div>

              {queryResult && (
                <div className="rounded-xl border border-slate-700/30 bg-[#0F172A]/40 p-4 space-y-2">
                  <p className="text-xs text-slate-500">Generated SQL:</p>
                  <pre className="text-xs text-accent font-mono whitespace-pre-wrap">
                    {queryResult.sql}
                  </pre>
                  <p className="text-xs text-slate-500 mt-2">
                    {queryResult.rows?.length || 0} rows returned
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => setStep("test")}
                  className="text-sm text-slate-500 hover:text-slate-300"
                >
                  Back
                </button>
                <Button onClick={completeOnboarding} variant="primary" className="w-full sm:w-auto">
                  Finish Setup <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardBody>
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  You are all set
                </h2>
                <p className="text-slate-400 mt-2">
                  Start exploring your data with AI-powered queries.
                </p>
              </div>
              <Button onClick={completeOnboarding} variant="primary">
                Start Exploring <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
