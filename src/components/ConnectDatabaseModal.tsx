"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import { isExcelFileName, listExcelSheets } from "@/src/lib/excelSheets";
import { uploadCsvFile, getAuthHeaders } from "@/lib/uploadUtils";
import {
  fetchAccessibleDataSources,
  type DataSourceSummary,
} from "@/src/lib/datasourceClient";

type ConnectorType = "postgres" | "mysql" | "sqlite" | "csv";

type FormState = {
  type: ConnectorType;
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};

const defaults: FormState = {
  type: "postgres",
  name: "",
  host: "",
  port: "5432",
  database: "",
  user: "",
  password: "",
};

const portDefaults: Record<ConnectorType, string> = {
  postgres: "5432",
  mysql: "3306",
  sqlite: "",
  csv: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a datasource is successfully saved / uploaded */
  onConnected: () => void;
};

export default function ConnectDatabaseModal({ open, onClose, onConnected }: Props) {
  const [form, setForm] = useState<FormState>(defaults);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<boolean | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [sheetBusy, setSheetBusy] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setForm(defaults);
      setTesting(false);
      setSaving(false);
      setTestOk(null);
      setTestMsg(null);
      setSaveOk(null);
      setSaveMsg(null);
      setCsvFile(null);
      setSheetOptions([]);
      setSelectedSheet("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const authHeaders = useCallback(async () => {
    return await getAuthHeaders();
  }, []);

  const isSpreadsheet = form.type === "csv";
  const supportsTest = form.type !== "csv";
  const supportsSaveConnection = form.type !== "csv";

  const buildTestPayload = useCallback(() => {
    if (form.type === "sqlite") {
      return { type: "sqlite" as const, database: form.database };
    }
    if (form.type === "csv") return null;
    return {
      type: form.type,
      host: form.host,
      ...(form.port.trim() ? { port: Number(form.port) } : {}),
      database: form.database,
      user: form.user,
      ...(form.password ? { password: form.password } : {}),
    };
  }, [form]);

  const buildConnectionPayload = useCallback(() => {
    if (form.type === "sqlite") {
      return { type: "sqlite" as const, name: form.name, database: form.database };
    }
    if (form.type === "csv") return null;
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

  const applyDatasource = useCallback((ds: DataSourceSummary | null) => {
    if (!ds) return;
    localStorage.setItem("datasourceId", ds.id);
    if (ds.orgId) localStorage.setItem("orgId", ds.orgId);
  }, []);

  const onTest = useCallback(async () => {
    if (!supportsTest) return;
    const payload = buildTestPayload();
    if (!payload) return;

    setTesting(true);
    setTestOk(null);
    setTestMsg(null);
    try {
      const res = await fetch("/api/datasources/test", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestOk(false);
        setTestMsg(data?.error || "Connection failed");
      } else {
        setTestOk(true);
        setTestMsg(`Connected in ${data.ms} ms`);
      }
    } catch (error: any) {
      setTestOk(false);
      setTestMsg(String(error?.message || error));
    } finally {
      setTesting(false);
    }
  }, [authHeaders, buildTestPayload, supportsTest]);

  const onSave = useCallback(async () => {
    if (!supportsSaveConnection) return;
    const payload = buildConnectionPayload();
    if (!payload) return;

    setSaving(true);
    setSaveOk(null);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/datasources/save", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveOk(false);
        setSaveMsg(data?.error || "Failed to save");
      } else {
        setSaveOk(true);
        setSaveMsg("Connected successfully!");
        if (data?.orgId) localStorage.setItem("orgId", data.orgId);
        const list = await fetchAccessibleDataSources();
        const selected =
          (data?.id ? list.find((ds) => ds.id === data.id) : null) || list[0] || null;
        applyDatasource(selected);
        // Brief delay so user sees the success message
        setTimeout(() => {
          onConnected();
          onClose();
        }, 800);
      }
    } catch (error: any) {
      setSaveOk(false);
      setSaveMsg(String(error?.message || error));
    } finally {
      setSaving(false);
    }
  }, [applyDatasource, authHeaders, buildConnectionPayload, onClose, onConnected, supportsSaveConnection]);

  const handleSpreadsheetSelected = useCallback(async (file: File | null) => {
    setCsvFile(file);
    setSheetOptions([]);
    setSelectedSheet("");
    if (!file || !isExcelFileName(file.name)) return;
    setSheetBusy(true);
    try {
      const sheets = await listExcelSheets(file);
      setSheetOptions(sheets);
      if (sheets.length > 0) setSelectedSheet(sheets[0]!);
    } catch {
      // ignore
    } finally {
      setSheetBusy(false);
    }
  }, []);

  const onUploadCsv = useCallback(async () => {
    if (!csvFile) return;
    setUploadingCsv(true);
    setSaveOk(null);
    setSaveMsg(null);
    try {
      const payload = await uploadCsvFile(csvFile, form.name || csvFile.name, selectedSheet);
      setSaveOk(true);
      setSaveMsg("Uploaded successfully!");
      if (payload.orgId) localStorage.setItem("orgId", payload.orgId);
      const list = await fetchAccessibleDataSources();
      const selected =
        (payload.id ? list.find((ds) => ds.id === payload.id) : null) || list[0] || null;
      applyDatasource(selected);
      setTimeout(() => {
        onConnected();
        onClose();
      }, 800);
    } catch (err: any) {
      setSaveOk(false);
      setSaveMsg(err.message || "Upload failed");
    } finally {
      setUploadingCsv(false);
    }
  }, [applyDatasource, csvFile, form.name, onClose, onConnected, selectedSheet]);

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSpreadsheet) {
        onUploadCsv();
      } else {
        onSave();
      }
    },
    [isSpreadsheet, onSave, onUploadCsv],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0d0b14] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0d0b14] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-grape-300">
              <Database className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Connect Your Data</h2>
              <p className="text-xs text-grape-400">Database or spreadsheet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-grape-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form className="space-y-5 px-5 py-5" onSubmit={handleFormSubmit} noValidate>
          {/* Connector type selector */}
          <div>
            <label className="block text-sm font-medium text-grape-200 mb-2">Source Type</label>
            <div className="flex flex-wrap gap-2">
              {([
                { type: "postgres" as ConnectorType, label: "PostgreSQL" },
                { type: "mysql" as ConnectorType, label: "MySQL" },
                { type: "sqlite" as ConnectorType, label: "SQLite" },
                { type: "csv" as ConnectorType, label: "Spreadsheet" },
              ]).map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, type, port: portDefaults[type] || prev.port }));
                    setTestOk(null);
                    setTestMsg(null);
                    setSaveOk(null);
                    setSaveMsg(null);
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    form.type === type
                      ? "border-white/[0.15] bg-white/[0.06] text-white"
                      : "border-white/[0.08] text-grape-400 hover:border-white/[0.12] hover:text-grape-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Connection Name"
            value={form.name}
            onChange={(e) => update("name", (e.target as HTMLInputElement).value)}
            placeholder="e.g., My production database"
            helperText="A friendly name for this connection."
          />

          {isSpreadsheet ? (
            /* Spreadsheet upload */
            <div className="space-y-3">
              <label className="block text-sm font-medium text-grape-200">Upload Spreadsheet</label>
              <div className="relative rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] p-6 text-center transition hover:border-white/[0.12]">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => handleSpreadsheetSelected(e.target.files?.[0] || null)}
                />
                <Database className="h-7 w-7 text-grape-400 mx-auto mb-2" />
                <p className="text-sm text-grape-300">
                  {csvFile ? csvFile.name : "Drop a .csv, .xlsx, or .xls file here or click to browse"}
                </p>
                <p className="text-xs text-grape-500 mt-1">Max 10 MB</p>
                {sheetBusy && <p className="mt-2 text-xs text-grape-400">Reading sheets...</p>}
              </div>
              {!sheetBusy && sheetOptions.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-grape-200">Excel Sheet</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-grape-100 focus:border-white/[0.15] focus:outline-none focus:ring-1 focus:ring-white/[0.1]"
                  >
                    {sheetOptions.map((sheet) => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))}
                  </select>
                </div>
              )}
              {!sheetBusy && sheetOptions.length === 1 && selectedSheet && (
                <p className="text-xs text-grape-400">Using sheet: {selectedSheet}</p>
              )}
            </div>
          ) : form.type === "sqlite" ? (
            <Input
              label="Database File Path"
              value={form.database}
              onChange={(e) => update("database", (e.target as HTMLInputElement).value)}
              placeholder="/path/to/database.db"
              helperText="Path to your SQLite file on the server."
            />
          ) : (
            /* PostgreSQL / MySQL fields */
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Host"
                    value={form.host}
                    onChange={(e) => update("host", (e.target as HTMLInputElement).value)}
                    placeholder="db.example.com"
                  />
                </div>
                <Input
                  label="Port"
                  value={form.port}
                  onChange={(e) => update("port", (e.target as HTMLInputElement).value)}
                  placeholder={form.type === "mysql" ? "3306" : "5432"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Database"
                  value={form.database}
                  onChange={(e) => update("database", (e.target as HTMLInputElement).value)}
                  placeholder={form.type === "mysql" ? "mydb" : "postgres"}
                />
                <Input
                  label="User"
                  value={form.user}
                  onChange={(e) => update("user", (e.target as HTMLInputElement).value)}
                  placeholder="datavista_reader"
                />
              </div>

              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => update("password", (e.target as HTMLInputElement).value)}
                placeholder="Enter password"
              />
            </>
          )}

          {/* Test / Save feedback */}
          {testMsg && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                testOk
                  ? "border border-mint-500/30 bg-mint-500/10 text-mint-300"
                  : "border border-red-400/30 bg-red-500/10 text-red-300"
              }`}
            >
              {testOk ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {testMsg}
            </div>
          )}
          {saveMsg && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                saveOk
                  ? "border border-mint-500/30 bg-mint-500/10 text-mint-300"
                  : "border border-red-400/30 bg-red-500/10 text-red-300"
              }`}
            >
              {saveOk ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {saveMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {isSpreadsheet ? (
              <Button
                type="submit"
                disabled={!csvFile || uploadingCsv}
                variant="primary"
              >
                {uploadingCsv ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  "Upload & Connect"
                )}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={testing}
                  onClick={onTest}
                >
                  {testing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Testing...</>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button type="submit" disabled={saving} variant="primary">
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    "Save & Connect"
                  )}
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
