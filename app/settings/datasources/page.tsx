"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Database, TestTube2, Shield, HelpCircle, Loader2, CheckCircle2, XCircle, Info, Trash2 } from "lucide-react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import RequireAuth from "@/src/components/RequireAuth";
import SchemaPreview from "@/src/components/SchemaPreview";
import {
  deleteAccessibleDataSource,
  fetchAccessibleDataSources,
  type DataSourceSummary,
} from "@/src/lib/datasourceClient";
import { isExcelFileName, listExcelSheets } from "@/src/lib/excelSheets";
import type { ParsedTable } from "@/lib/schemaParser";
import { uploadCsvFile, getAuthHeaders } from "@/lib/uploadUtils";

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

const demoDefaults: FormState = {
  type: "postgres",
  name: "Primary",
  host: "localhost",
  port: "5432",
  database: "postgres",
  user: "postgres",
  password: "",
};

const portDefaults: Record<ConnectorType, string> = {
  postgres: "5432",
  mysql: "3306",
  sqlite: "",
  csv: "",
};

export default function DataSourcesSettingsPage() {
  const [form, setForm] = useState<FormState>(demoDefaults);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<boolean | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [sheetBusy, setSheetBusy] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [schemaPreview, setSchemaPreview] = useState<ParsedTable[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [discoveredTables, setDiscoveredTables] = useState<string[]>([]);
  const [monitoredTables, setMonitoredTables] = useState<string[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceSummary[]>([]);
  const [activeDatasourceId, setActiveDatasourceId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setActiveDatasourceId(localStorage.getItem("datasourceId"));
    } catch {
      setActiveDatasourceId(null);
    }
  }, []);

  const applyPrimaryDataSource = useCallback((existing: DataSourceSummary | null) => {
    if (!existing) return;
    setForm({
      type: (existing.type as ConnectorType) || "postgres",
      name: existing.name || "",
      host: existing.host || "",
      port: existing.port ? String(existing.port) : "",
      database: existing.database || "",
      user: existing.user || "",
      password: "",
    });
    setActiveDatasourceId(existing.id);
    localStorage.setItem("datasourceId", existing.id);
    setMonitoredTables(existing.scopedTables || []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadExisting() {
      setLoadingExisting(true);
      setLoadError(null);
      try {
        const list = await fetchAccessibleDataSources();
        if (cancelled) return;
        setDataSources(list);
        if (list.length > 0) {
          applyPrimaryDataSource(list[0]!);
          setSaveOk(true);
          setSaveMsg("Loaded saved connection");
        }
      } catch (error: any) {
        if (!cancelled) {
          setLoadError(String(error?.message || error));
        }
      } finally {
        if (!cancelled) {
          setLoadingExisting(false);
        }
      }
    }

    loadExisting();

    return () => {
      cancelled = true;
    };
  }, [applyPrimaryDataSource]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);


  const toggleMonitoredTable = useCallback((tableName: string) => {
    setMonitoredTables((prev) => (
      prev.includes(tableName)
        ? prev.filter((name) => name !== tableName)
        : [...prev, tableName]
    ));
  }, []);

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
      setSaveOk(false);
      setSaveMsg("Could not read Excel sheets. You can still upload using the first sheet.");
    } finally {
      setSheetBusy(false);
    }
  }, []);

  const authHeaders = useCallback(async () => {
    return await getAuthHeaders();
  }, []);

  const isSpreadsheet = form.type === "csv";
  const supportsSaveConnection = form.type !== "csv";
  const supportsTest = form.type !== "csv";

  const buildConnectionPayload = useCallback(() => {
    if (form.type === "sqlite") {
      return {
        type: "sqlite" as const,
        name: form.name,
        database: form.database,
      };
    }

    if (form.type === "csv") {
      return null;
    }

    const selected = monitoredTables.length ? monitoredTables : discoveredTables;

    return {
      type: form.type,
      name: form.name,
      host: form.host,
      ...(form.port.trim() ? { port: Number(form.port) } : {}),
      database: form.database,
      user: form.user,
      ...(form.password ? { password: form.password } : {}),
      monitoredTables: selected,
    };
  }, [discoveredTables, form, monitoredTables]);

  const buildTestPayload = useCallback(() => {
    if (form.type === "sqlite") {
      return {
        type: "sqlite" as const,
        database: form.database,
      };
    }

    if (form.type === "csv") {
      return null;
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

  const fetchSchemaPreview = useCallback(async () => {
    if (form.type === "csv" || form.type === "sqlite") return;
    const payload = buildTestPayload();
    if (!payload) return;
    setLoadingPreview(true);
    setSchemaPreview(null);
    try {
      const res = await fetch("/api/datasources/schema-preview", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const tables: ParsedTable[] = data.tables || [];
        setSchemaPreview(tables);
        const discovered = tables.map((t) => t.name);
        setDiscoveredTables(discovered);
        setMonitoredTables((prev) => (prev.length ? prev.filter((name) => discovered.includes(name)) : discovered));
      }
    } catch {
      // Non-critical — just don't show the preview
    } finally {
      setLoadingPreview(false);
    }
  }, [authHeaders, buildTestPayload, form.type]);

  const onTest = useCallback(async () => {
    if (!supportsTest) {
      setTestOk(false);
      setTestMsg("Spreadsheet uploads are tested during upload. Use 'Upload & Connect'.");
      return;
    }

    const payload = buildTestPayload();
    if (!payload) {
      setTestOk(false);
      setTestMsg("Missing connection details.");
      return;
    }

    setTesting(true);
    setTestOk(null);
    setTestMsg(null);
    try {
      const res = await fetch("/api/datasources/test", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      const responsePayload = await res.json();
      if (!res.ok) {
        setTestOk(false);
        setTestMsg(responsePayload?.error || "Failed");
      } else {
        setTestOk(true);
        setTestMsg(`${responsePayload.ms} ms`);
        // Auto-fetch schema preview on successful test
        fetchSchemaPreview();
      }
    } catch (error: any) {
      setTestOk(false);
      setTestMsg(String(error?.message || error));
    } finally {
      setTesting(false);
    }
  }, [authHeaders, buildTestPayload, fetchSchemaPreview, supportsTest]);

  const refreshDataSources = useCallback(async () => {
    const list = await fetchAccessibleDataSources();
    setDataSources(list);
    return list;
  }, []);

  const onSave = useCallback(async () => {
    if (!supportsSaveConnection) {
      setSaveOk(false);
      setSaveMsg("Spreadsheet sources are created via 'Upload & Connect'.");
      return;
    }

    const payload = buildConnectionPayload();
    if (!payload) {
      setSaveOk(false);
      setSaveMsg("Missing connection details.");
      return;
    }

    setSaving(true);
    setSaveOk(null);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/datasources/save", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      const responsePayload = await res.json();
      if (!res.ok) {
        setSaveOk(false);
        setSaveMsg(responsePayload?.error || "Failed");
      } else {
        setSaveOk(true);
        setSaveMsg("Saved");
        if (Array.isArray(responsePayload?.monitoredTables)) {
          setMonitoredTables(responsePayload.monitoredTables);
        }
        const list = await refreshDataSources();
        const selected =
          (responsePayload?.id ? list.find((ds) => ds.id === responsePayload.id) : null) ||
          list[0] ||
          null;
        applyPrimaryDataSource(selected);
      }
    } catch (error: any) {
      setSaveOk(false);
      setSaveMsg(String(error?.message || error));
    } finally {
      setSaving(false);
    }
  }, [applyPrimaryDataSource, authHeaders, buildConnectionPayload, refreshDataSources, supportsSaveConnection]);

  const onDeleteDataSource = useCallback(async (id: string) => {
    setDeletingId(id);
    setSaveOk(null);
    setSaveMsg(null);
    try {
      const response = await deleteAccessibleDataSource(id);
      const list = await refreshDataSources();

      if (activeDatasourceId === id) {
        const next = list[0] || null;
        if (next) {
          applyPrimaryDataSource(next);
        } else {
          localStorage.removeItem("datasourceId");
          setActiveDatasourceId(null);
          setForm(demoDefaults);
        }
      }

      setSaveOk(true);
      setSaveMsg(response.cleanupWarning || "Data source removed");
    } catch (error: any) {
      setSaveOk(false);
      setSaveMsg(String(error?.message || error));
    } finally {
      setDeletingId(null);
    }
  }, [activeDatasourceId, applyPrimaryDataSource, refreshDataSources]);

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSave();
    },
    [onSave],
  );

  return (
    <RequireAuth
      title="Sign in to manage data sources"
      description="Configure and test your database or spreadsheet connection securely."
    >
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-grape-300 icon-glow">
              <Database className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Data Sources</h1>
          </div>
          <p className="text-grape-300 text-sm max-w-lg">
            Connect your data so you can start asking questions. You can either connect a database (ask your IT team for the details) or upload a spreadsheet (CSV or Excel).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connection form - takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                title="Connection Details"
                subtitle="Configure your database connection"
              />
              <CardBody>
                <form className="space-y-5" onSubmit={handleFormSubmit} noValidate>
                  {loadingExisting && (
                    <div className="flex items-center gap-2 text-sm text-grape-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading saved connection...
                    </div>
                  )}
                  {loadError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3">
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <p role="alert" className="text-sm text-red-300">{loadError}</p>
                    </div>
                  )}

                  {/* Connector type selector */}
                  <div>
                    <label className="block text-sm font-medium text-grape-100 mb-1.5">Database Type</label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { type: "postgres" as ConnectorType, label: "PostgreSQL" },
                        { type: "mysql" as ConnectorType, label: "MySQL" },
                        { type: "sqlite" as ConnectorType, label: "SQLite" },
                        { type: "csv" as ConnectorType, label: "Spreadsheet Upload" },
                      ]).map(({ type, label }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, type, port: portDefaults[type] || prev.port }));
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs sm:px-4 sm:text-sm font-medium transition-all ${
                            form.type === type
                              ? "border-white/[0.1] bg-white/[0.05] text-white"
                              : "border-white/[0.08] text-grape-300 hover:border-white/[0.1] hover:text-white"
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
                    onChange={(event) => update("name", (event.target as HTMLInputElement).value)}
                    placeholder="e.g., Primary warehouse"
                    helperText="A friendly label to identify this connection."
                  />

                  {form.type === "csv" ? (
                    /* Spreadsheet upload zone */
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-grape-100">Upload Spreadsheet</label>
                      <div className="relative rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] p-5 sm:p-8 text-center transition hover:border-white/[0.1]">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleSpreadsheetSelected(file);
                          }}
                        />
                        <Database className="h-8 w-8 text-grape-400 mx-auto mb-2" />
                        <p className="text-sm text-grape-300">
                          {csvFile ? csvFile.name : "Drop a .csv, .xlsx, or .xls file here or click to browse"}
                        </p>
                        <p className="text-xs text-grape-500 mt-1">Max 10MB</p>
                        {sheetBusy && <p className="mt-2 text-xs text-grape-400">Reading workbook sheets...</p>}
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
                              <option key={sheet} value={sheet}>
                                {sheet}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {!sheetBusy && sheetOptions.length === 1 && selectedSheet && (
                        <p className="text-xs text-grape-400">Using sheet: {selectedSheet}</p>
                      )}
                      <Button
                        type="button"
                        variant="primary"
                        className="w-full sm:w-auto"
                        disabled={!csvFile || uploadingCsv}
                        onClick={async () => {
                          if (!csvFile) return;
                          setUploadingCsv(true);
                          setSaveOk(null);
                          setSaveMsg(null);
                          try {
                            const payload = await uploadCsvFile(
                              csvFile,
                              form.name || csvFile.name,
                              selectedSheet
                            );
                            setSaveOk(true);
                            setSaveMsg("File uploaded successfully");
                            const list = await refreshDataSources();
                            const selected =
                              (payload.id ? list.find((ds) => ds.id === payload.id) : null) ||
                              list[0] ||
                              null;
                            applyPrimaryDataSource(selected);
                          } catch (err: any) {
                            setSaveOk(false);
                            setSaveMsg(err.message || "Upload failed");
                          } finally {
                            setUploadingCsv(false);
                          }
                        }}
                      >
                        {uploadingCsv ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                        ) : (
                          "Upload & Connect"
                        )}
                      </Button>
                    </div>
                  ) : form.type === "sqlite" ? (
                    /* SQLite file path field */
                    <>
                      <Input
                        label="Database File Path"
                        value={form.database}
                        onChange={(event) => update("database", (event.target as HTMLInputElement).value)}
                        placeholder="/path/to/database.db"
                        helperText="The path to your SQLite database file on the server. Use ':memory:' for an in-memory database."
                      />
                    </>
                  ) : (
                    /* Database connection fields (PostgreSQL / MySQL) */
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <Input
                            label="Host"
                            value={form.host}
                            onChange={(event) => update("host", (event.target as HTMLInputElement).value)}
                            placeholder="db.example.com"
                            helperText="The server address where your database lives (your IT team can provide this)."
                          />
                        </div>
                        <Input
                          label="Port"
                          value={form.port}
                          onChange={(event) => update("port", (event.target as HTMLInputElement).value)}
                          placeholder={form.type === "mysql" ? "3306" : "5432"}
                          helperText={`Usually ${form.type === "mysql" ? "3306" : "5432"} — leave as-is if unsure.`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Database"
                          value={form.database}
                          onChange={(event) => update("database", (event.target as HTMLInputElement).value)}
                          placeholder={form.type === "mysql" ? "mydb" : "postgres"}
                          helperText="The name of the specific database you want to query."
                        />
                        <Input
                          label="User"
                          value={form.user}
                          onChange={(event) => update("user", (event.target as HTMLInputElement).value)}
                          placeholder="datavista_reader"
                          helperText="The username for connecting (a read-only account is safest)."
                        />
                      </div>

                      <Input
                        label="Password"
                        type="password"
                        value={form.password}
                        onChange={(event) => update("password", (event.target as HTMLInputElement).value)}
                        placeholder="Enter password"
                        helperText="Your database password. This is encrypted and stored securely."
                      />
                    </>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {supportsSaveConnection ? (
                      <Button type="submit" disabled={saving} variant="primary">
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Connection"
                        )}
                      </Button>
                    ) : (
                      <p className="text-xs text-grape-400">
                        Spreadsheet sources are saved automatically when you click &quot;Upload &amp; Connect&quot;.
                      </p>
                    )}
                    {saveMsg && (
                      <span className={`inline-flex items-center gap-1.5 text-sm ${saveOk ? "text-mint-400" : "text-red-400"}`} aria-live="polite">
                        {saveOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {saveMsg}
                      </span>
                    )}
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Test card */}
            <Card>
              <CardHeader
                title={isSpreadsheet ? "Upload Validation" : "Test Connection"}
                subtitle={isSpreadsheet ? "Spreadsheets are validated at upload time" : "Check if everything works"}
              />
              <CardBody>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <TestTube2 className="h-5 w-5 text-grape-400 shrink-0" />
                    <p className="text-xs text-grape-300">
                      {isSpreadsheet
                        ? "Use the upload section to validate and connect your spreadsheet."
                        : "Click below to verify Data Vista can reach your database. This is a quick check that takes a few seconds."}
                    </p>
                  </div>
                  <Button
                    onClick={onTest}
                    disabled={testing || !supportsTest}
                    variant="secondary"
                    type="button"
                    className="w-full"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      isSpreadsheet ? "Use Upload & Connect Above" : "Run Test"
                    )}
                  </Button>
                  {testMsg && (
                    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${testOk ? "border border-mint-500/30 bg-mint-500/10 text-mint-300" : "border border-red-400/30 bg-red-500/10 text-red-300"}`}>
                      {testOk ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                      {testOk ? `Connected in ${testMsg}` : testMsg}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Connected Sources" subtitle="Manage saved database and spreadsheet connections" />
              <CardBody>
                {dataSources.length === 0 ? (
                  <p className="text-xs text-grape-400">No sources connected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {dataSources.map((ds) => (
                      <div
                        key={ds.id}
                        className="flex flex-col items-start justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-grape-100">{ds.name}</p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-grape-400">
                            {(ds.type || "unknown").toUpperCase()} {activeDatasourceId === ds.id ? "• ACTIVE" : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteDataSource(ds.id)}
                          disabled={deletingId === ds.id}
                          className="inline-flex h-8 w-8 items-center justify-center self-end rounded-md border border-red-500/30 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50 sm:self-auto"
                          aria-label={`Delete ${ds.name}`}
                          title={`Delete ${ds.name}`}
                        >
                          {deletingId === ds.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Schema preview (auto-shown after successful test) */}
            {(loadingPreview || schemaPreview) && (
              <Card>
                <CardHeader title="Database Preview" subtitle="Tables found in your database" />
                <CardBody>
                  {loadingPreview ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-sm text-grape-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning your database...
                    </div>
                  ) : schemaPreview && schemaPreview.length > 0 ? (
                    <div className="space-y-4">
                      <SchemaPreview tables={schemaPreview} />
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-grape-300">Monitored Tables</p>
                        <p className="mb-3 text-xs text-grape-400">Select the tables Data Vista can use for queries.</p>
                        <div className="max-h-48 space-y-1 overflow-auto pr-1">
                          {discoveredTables.map((tableName) => (
                            <label key={tableName} className="flex items-center gap-2 text-xs text-grape-200">
                              <input
                                type="checkbox"
                                checked={monitoredTables.includes(tableName)}
                                onChange={() => toggleMonitoredTable(tableName)}
                              />
                              <span>{tableName}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-grape-400 text-center py-4">No tables found in this database.</p>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Setup checklist */}
            <Card>
              <CardHeader title="Setup Checklist" />
              <CardBody>
                <div className="space-y-3">
                  {[
                    { icon: Database, text: "Get connection details from your IT team or database provider" },
                    { icon: Shield, text: "Use a read-only account for safety (Data Vista never modifies your data)" },
                    { icon: Info, text: "If your database is behind a firewall, ask IT to allow Data Vista access" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        <div className="h-6 w-6 rounded-lg bg-white/[0.05] flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5 text-white/[0.5]" />
                        </div>
                      </div>
                      <p className="text-xs text-grape-300 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Help */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-grape-400" />
                <p className="text-xs font-medium text-grape-200">Need help?</p>
              </div>
              <p className="text-xs text-grape-400 leading-relaxed">
                Having trouble connecting? Don&apos;t worry — most issues are simple to fix. Share this page with your IT team or{" "}
                <a href="mailto:support@datavista.io" className="text-grape-300 hover:text-white transition-colors underline">
                  contact our support team
                </a>{" "}
                and we&apos;ll help you get set up.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
