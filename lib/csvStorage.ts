import { existsSync, readdirSync, rmSync, statSync } from "fs";
import { join, relative } from "path";

type CsvMetadata = {
  filePath?: unknown;
  storage?: unknown;
};

function toUploadRelativePath(rawPath: string): string | null {
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized.toLowerCase().startsWith("uploads/")) return null;
  return normalized;
}

export function extractCsvFilePath(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const filePath = (metadata as CsvMetadata).filePath;
  return typeof filePath === "string" && filePath.trim() ? filePath.trim() : null;
}

export function resolveManagedUploadPath(filePath: string): string | null {
  const relativePath = toUploadRelativePath(filePath);
  if (!relativePath) return null;

  const uploadsRoot = join(process.cwd(), "uploads");
  const absolutePath = join(process.cwd(), relativePath);
  const relativeToUploads = relative(uploadsRoot, absolutePath);

  if (!relativeToUploads || relativeToUploads.startsWith("..")) return null;
  return absolutePath;
}

export async function deleteManagedUploadFile(filePath: string): Promise<{ deleted: boolean; reason?: string }> {
  // R2 storage
  if (filePath.startsWith("r2://")) {
    try {
      const { deleteFromR2, r2KeyFromPath } = await import("@/lib/r2");
      await deleteFromR2(r2KeyFromPath(filePath));
      return { deleted: true };
    } catch {
      return { deleted: false, reason: "r2_delete_failed" };
    }
  }

  // Local filesystem
  const absolutePath = resolveManagedUploadPath(filePath);
  if (!absolutePath) {
    return { deleted: false, reason: "unsafe_path" };
  }

  try {
    if (!existsSync(absolutePath)) {
      return { deleted: false, reason: "not_found" };
    }
    rmSync(absolutePath, { force: true });
    return { deleted: true };
  } catch {
    return { deleted: false, reason: "delete_failed" };
  }
}

export function cleanupStaleUploadFiles(params: {
  referencedPaths: Iterable<string>;
  retentionDays: number;
  nowMs?: number;
}): { scanned: number; deleted: number } {
  const { retentionDays, nowMs = Date.now() } = params;
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return { scanned: 0, deleted: 0 };
  }

  const uploadsRoot = join(process.cwd(), "uploads");
  if (!existsSync(uploadsRoot)) {
    return { scanned: 0, deleted: 0 };
  }

  const keep = new Set(
    Array.from(params.referencedPaths)
      .map((p) => toUploadRelativePath(p))
      .filter((p): p is string => Boolean(p))
      .map((p) => p.toLowerCase()),
  );

  const cutoffMs = nowMs - retentionDays * 24 * 60 * 60 * 1000;
  let scanned = 0;
  let deleted = 0;

  for (const fileName of readdirSync(uploadsRoot)) {
    const absolutePath = join(uploadsRoot, fileName);
    let stats;
    try {
      stats = statSync(absolutePath);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;

    const relativePath = `uploads/${fileName}`;
    scanned += 1;
    if (keep.has(relativePath.toLowerCase())) continue;
    if (stats.mtimeMs >= cutoffMs) continue;

    try {
      rmSync(absolutePath, { force: true });
      deleted += 1;
    } catch {
      // Keep processing remaining files.
    }
  }

  return { scanned, deleted };
}
