"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Database, Loader2, CheckCircle2, XCircle, Upload } from "lucide-react";
import Modal from "@/src/components/ui/Modal";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import { isExcelFileName, listExcelSheets } from "@/src/lib/excelSheets";
import { uploadCsvFile, getAuthHeaders } from "@/lib/uploadUtils";
import {
  fetchAccessibleDataSources,
  type DataSourceSummary,
} from "@/src/lib/datasourceClient";

type ConnectorType = "postgres" | "mysql" | "csv";

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
  csv: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
};

export default function ConnectDatabaseModal({ open, onClose, onConnected }: Props) {
  const [form, setForm] = useState<FormState>(defaults);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [sheetBusy, setSheetBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(defaults);
      setTesting(false);
      setSaving(false);
      setFeedback(null);
      setCsvFile(null);
      setSheetOptions([]);
      setSelectedSheet("");
    }
  }, [open]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const isSpreadsheet = form.type === "csv";

  const applyDatasource = useCallback((ds: DataSourceSummary | null) => {
    if (!ds) return;
    localStorage.setItem("datasourceId", ds.id);
  }, []);

  const onTest = useCallback(async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/datasources/test", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: form.type,
          host: form.host,
          ...(form.port.trim() ? { port: Number(form.port) } : {}),
          database: form.database,
          user: form.user,
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      const data = await res.json();
      setFeedback(res.ok
        ? { ok: true, msg: `Connected in ${data.ms} ms` }
        : { ok: false, msg: data?.error || "Connection failed" }
      );
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.message || String(err) });
    } finally {
      setTesting(false);
    }
  }, [form]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/datasources/save", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: form.type,
          name: form.name,
          host: form.host,
          ...(form.port.trim() ? { port: Number(form.port) } : {}),
          database: form.database,
          user: form.user,
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, msg: data?.error || "Failed to save" });
        return;
      }
      setFeedback({ ok: true, msg: "Connected!" });
      const list = await fetchAccessibleDataSources();
      applyDatasource((data?.id ? list.find((ds) => ds.id === data.id) : null) || list[0] || null);
      setTimeout(() => { onConnected(); onClose(); }, 600);
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.message || String(err) });
    } finally {
      setSaving(false);
    }
  }, [applyDatasource, form, onClose, onConnected]);

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
    } catch { /* ignore */ } finally {
      setSheetBusy(false);
    }
  }, []);

  const onUploadCsv = useCallback(async () => {
    if (!csvFile) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload = await uploadCsvFile(csvFile, form.name || csvFile.name, selectedSheet);
      setFeedback({ ok: true, msg: "Uploaded!" });
      const list = await fetchAccessibleDataSources();
      applyDatasource((payload.id ? list.find((ds) => ds.id === payload.id) : null) || list[0] || null);
      setTimeout(() => { onConnected(); onClose(); }, 600);
    } catch (err: any) {
      setFeedback({ ok: false, msg: err.message || "Upload failed" });
    } finally {
      setSaving(false);
    }
  }, [applyDatasource, csvFile, form.name, onClose, onConnected, selectedSheet]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      isSpreadsheet ? onUploadCsv() : onSave();
    },
    [isSpreadsheet, onSave, onUploadCsv],
  );

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">Connect Your Data</h2>
          <p className="text-sm text-grape-400 mt-1">Database or spreadsheet</p>
        </div>

        {/* Source type pills */}
        <div className="flex gap-1.5">
          {([
            { type: "postgres" as ConnectorType, label: "PostgreSQL" },
            { type: "mysql" as ConnectorType, label: "MySQL" },
            { type: "csv" as ConnectorType, label: "Spreadsheet" },
          ]).map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, type, port: portDefaults[type] || prev.port }));
                setFeedback(null);
              }}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                form.type === type
                  ? "border-white/[0.15] bg-white/[0.06] text-white"
                  : "border-white/[0.06] text-grape-400 hover:text-grape-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Name */}
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => update("name", (e.target as HTMLInputElement).value)}
          placeholder={isSpreadsheet ? "e.g., Sales data" : "e.g., Production DB"}
        />

        {isSpreadsheet ? (
          <div>
            <label className="block text-sm font-medium text-grape-200 mb-1.5">File</label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-4 transition hover:border-white/[0.14]">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={(e) => handleSpreadsheetSelected(e.target.files?.[0] || null)}
              />
              <Upload className="h-4 w-4 text-grape-400 shrink-0" />
              <span className="text-sm text-grape-300 truncate">
                {csvFile ? csvFile.name : "Choose .csv, .xlsx, or .xls"}
              </span>
            </label>
            {sheetBusy && <p className="mt-1.5 text-xs text-grape-400">Reading sheets...</p>}
            {!sheetBusy && sheetOptions.length > 1 && (
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-grape-100 focus:border-white/[0.15] focus:outline-none"
              >
                {sheetOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
        ) : (
          /* --- Database fields --- */
          <>
            <div className="grid grid-cols-3 gap-2">
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
            <div className="grid grid-cols-2 gap-2">
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
                placeholder="reader"
              />
            </div>
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", (e.target as HTMLInputElement).value)}
              placeholder="••••••••"
            />
          </>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            feedback.ok
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border border-red-400/20 bg-red-500/10 text-red-300"
          }`}>
            {feedback.ok
              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              : <XCircle className="h-3.5 w-3.5 shrink-0" />}
            {feedback.msg}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isSpreadsheet ? (
            <Button type="submit" disabled={!csvFile || saving} variant="primary" className="flex-1">
              {saving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
                : "Upload & Connect"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" disabled={testing} onClick={onTest} className="flex-1">
                {testing
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing...</>
                  : "Test"}
              </Button>
              <Button type="submit" disabled={saving} variant="primary" className="flex-1">
                {saving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                  : "Save & Connect"}
              </Button>
            </>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
