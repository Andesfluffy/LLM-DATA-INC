import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_ERROR_MESSAGE, getUserFromRequest } from "@/lib/auth-server";
import { ensureUser } from "@/lib/userOrg";
import { cleanupStaleUploadFiles, deleteManagedUploadFile, extractCsvFilePath } from "@/lib/csvStorage";
import { replaceDatasourceScope } from "@/lib/datasourceScope";
import { parse } from "csv-parse/sync";
import { extname, join } from "path";
import { mkdirSync, writeFileSync } from "fs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_INLINE_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 30;
const SUPPORTED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls"]);
const DELIMITER_CANDIDATES = [",", ";", "\t", "|"] as const;

function sanitizeTableName(raw: string): string {
  const clean = raw
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return clean || "data";
}

function detectDelimiter(csvBuffer: Buffer): string {
  const sample = csvBuffer.toString("utf-8");
  let bestDelimiter = ",";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const delimiter of DELIMITER_CANDIDATES) {
    try {
      const rows = parse(sample, {
        bom: true,
        delimiter,
        skip_empty_lines: true,
        relax_column_count: true,
        to_line: 20,
      }) as unknown[];

      if (!Array.isArray(rows) || rows.length === 0) continue;

      const counts = rows
        .map((row) => (Array.isArray(row) ? row.length : 0))
        .filter((count) => count > 0);
      const headerWidth = counts[0] ?? 0;
      if (headerWidth <= 1 || counts.length === 0) continue;

      const maxWidth = Math.max(...counts);
      const minWidth = Math.min(...counts);
      const spreadPenalty = maxWidth - minWidth;
      const score = headerWidth * 10 - spreadPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    } catch {
      // Ignore parse errors for delimiter candidates.
    }
  }

  return Number.isFinite(bestScore) ? bestDelimiter : ",";
}

async function normalizeSpreadsheetToCsv(
  file: File,
  requestedSheetName?: string,
): Promise<{ csvBuffer: Buffer; sourceSheet?: string; availableSheets?: string[]; delimiter: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const extension = extname(file.name).toLowerCase();

  if (extension === ".csv") {
    return { csvBuffer: buffer, delimiter: detectDelimiter(buffer) };
  }

  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const nonEmptySheets = workbook.SheetNames.filter((name) => {
      const sheet = workbook.Sheets[name];
      return Boolean(sheet && sheet["!ref"]);
    });
    if (nonEmptySheets.length === 0) {
      throw new Error("Workbook has no sheets with data");
    }

    let sheetName = nonEmptySheets[0]!;
    if (requestedSheetName && requestedSheetName.trim()) {
      const requested = requestedSheetName.trim();
      const hasRequested = nonEmptySheets.includes(requested);
      if (!hasRequested) {
        throw new Error(`Sheet "${requested}" was not found or is empty.`);
      }
      sheetName = requested;
    }

    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]!, {
      FS: ",",
      RS: "\n",
      blankrows: false,
    });
    if (!csv.trim()) {
      throw new Error("The first sheet is empty");
    }

    return {
      csvBuffer: Buffer.from(csv, "utf-8"),
      sourceSheet: sheetName,
      availableSheets: nonEmptySheets,
      delimiter: ",",
    };
  } catch (error: any) {
    if (typeof error?.message === "string" && error.message.startsWith("Sheet ")) {
      throw error;
    }
    throw new Error("Unable to parse Excel file. Please upload a standard .xlsx or .xls file.");
  }
}

function inspectCsv(csvBuffer: Buffer, delimiter: string): { rowCount: number; columnCount: number; headers: string[] } {
  try {
    const rows = parse(csvBuffer.toString("utf-8"), {
      bom: true,
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as unknown[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return { rowCount: 0, columnCount: 0, headers: [] };
    }

    const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
    const headers = headerRow
      .map((h) => String(h ?? "").trim())
      .filter(Boolean)
      .slice(0, 100);

    return {
      rowCount: Math.max(0, rows.length - 1),
      columnCount: headerRow.length,
      headers,
    };
  } catch {
    return { rowCount: 0, columnCount: 0, headers: [] };
  }
}

function pickStorageMode(byteLength: number): "inline_base64" | "r2" | "filesystem" {
  const inlineLimit = Number(process.env.CSV_INLINE_MAX_BYTES || DEFAULT_INLINE_MAX_BYTES);

  if (byteLength <= inlineLimit) return "inline_base64";

  // Prefer R2 if configured, fall back to filesystem
  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID) return "r2";

  return "filesystem";
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 });

  const { user: dbUser } = await ensureUser(user);

  const retentionDays = Number(process.env.CSV_UPLOAD_RETENTION_DAYS || DEFAULT_RETENTION_DAYS);
  if (Number.isFinite(retentionDays) && retentionDays > 0) {
    try {
      const csvSources = await prisma.dataSource.findMany({
        where: { type: "csv" },
        select: { metadata: true },
      });
      const referencedPaths = csvSources
        .map((row: { metadata: unknown }) => extractCsvFilePath(row.metadata))
        .filter((filePath: string | null): filePath is string => Boolean(filePath));
      cleanupStaleUploadFiles({ referencedPaths, retentionDays });
    } catch {
      // Best-effort lifecycle cleanup; do not block uploads.
    }
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string) || "Spreadsheet Upload";
  const requestedSheet = (formData.get("sheetName") as string | null) || undefined;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = extname(file.name).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "Only .csv, .xlsx, and .xls files are supported" }, { status: 400 });
  }

  // 10MB limit
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  let parsed: { csvBuffer: Buffer; sourceSheet?: string; availableSheets?: string[]; delimiter: string };
  try {
    parsed = await normalizeSpreadsheetToCsv(file, requestedSheet);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Invalid spreadsheet file" }, { status: 400 });
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");

  // Use sheet name for Excel uploads when available, otherwise filename.
  const tableName = sanitizeTableName(parsed.sourceSheet || baseName);
  const stats = inspectCsv(parsed.csvBuffer, parsed.delimiter);
  const storage = pickStorageMode(parsed.csvBuffer.byteLength);

  const metadata: Record<string, unknown> = {
    storage,
    byteLength: parsed.csvBuffer.byteLength,
    tableName,
    delimiter: parsed.delimiter,
    rowCount: stats.rowCount,
    columnCount: stats.columnCount,
    headers: stats.headers,
    sourceFileName: file.name,
    sourceFormat: extension.replace(/^\./, ""),
    ...(parsed.sourceSheet ? { sheetName: parsed.sourceSheet } : {}),
    ...(parsed.availableSheets?.length ? { availableSheets: parsed.availableSheets } : {}),
  };

  if (storage === "inline_base64") {
    metadata.csvBase64 = parsed.csvBuffer.toString("base64");
  } else if (storage === "r2") {
    const { uploadToR2 } = await import("@/lib/r2");
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_") || "spreadsheet";
    const key = `csv/${dbUser.id}/${Date.now()}_${safeBaseName}.csv`;
    metadata.filePath = await uploadToR2(key, parsed.csvBuffer);
  } else {
    const uploadsDir = join(process.cwd(), "uploads");
    mkdirSync(uploadsDir, { recursive: true });
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_") || "spreadsheet";
    const safeFilename = `${dbUser.id}_${Date.now()}_${safeBaseName}.csv`;
    const filePath = join("uploads", safeFilename);
    writeFileSync(join(process.cwd(), filePath), parsed.csvBuffer);
    metadata.filePath = filePath;
  }

  const existing = await prisma.dataSource.findFirst({
    where: {
      ownerId: dbUser.id,
      type: "csv",
      name,
    },
  });

  const previousFilePath = extractCsvFilePath(existing?.metadata);

  const ds = existing
    ? await prisma.dataSource.update({
        where: { id: existing.id },
        data: {
          metadata,
          updatedAt: new Date(),
        },
      })
    : await prisma.dataSource.create({
        data: {
          ownerId: dbUser.id,
          name,
          type: "csv",
          metadata,
        },
      });

  await replaceDatasourceScope(ds.id, [tableName]);

  // Best-effort cleanup when replacing an existing filesystem/R2-backed spreadsheet.
  if (previousFilePath && previousFilePath !== metadata.filePath) {
    await deleteManagedUploadFile(previousFilePath);
  }

  return NextResponse.json({ id: ds.id, name: ds.name, sheetName: parsed.sourceSheet || null });
}
