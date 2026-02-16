import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readdirSync, rmSync, utimesSync, writeFileSync } from "fs";
import { join } from "path";

import { cleanupStaleUploadFiles, resolveManagedUploadPath } from "@/lib/csvStorage";

function cleanupTestArtifacts() {
  const uploadsDir = join(process.cwd(), "uploads");
  if (!existsSync(uploadsDir)) return;
  for (const fileName of readdirSync(uploadsDir)) {
    if (fileName.startsWith("csvstorage_test_")) {
      rmSync(join(uploadsDir, fileName), { force: true });
    }
  }
}

describe("csv storage helpers", () => {
  it("accepts managed upload paths and rejects traversal paths", () => {
    const valid = resolveManagedUploadPath("uploads/sample.csv");
    expect(typeof valid).toBe("string");
    expect(valid).toContain("uploads");

    const traversal = resolveManagedUploadPath("uploads/../secret.txt");
    expect(traversal).toBeNull();

    const outside = resolveManagedUploadPath("../uploads/sample.csv");
    expect(outside).toBeNull();
  });

  it("removes stale unreferenced upload files and keeps referenced ones", () => {
    cleanupTestArtifacts();
    const uploadsDir = join(process.cwd(), "uploads");
    mkdirSync(uploadsDir, { recursive: true });

    const nowMs = Date.now();
    const olderThanRetention = new Date(nowMs - 40 * 24 * 60 * 60 * 1000);

    const keepName = "csvstorage_test_keep.csv";
    const staleName = "csvstorage_test_stale.csv";
    const keepPath = join(uploadsDir, keepName);
    const stalePath = join(uploadsDir, staleName);
    writeFileSync(keepPath, "a,b\n1,2", "utf-8");
    writeFileSync(stalePath, "a,b\n1,2", "utf-8");
    utimesSync(keepPath, olderThanRetention, olderThanRetention);
    utimesSync(stalePath, olderThanRetention, olderThanRetention);

    const result = cleanupStaleUploadFiles({
      referencedPaths: [`uploads/${keepName}`],
      retentionDays: 30,
      nowMs,
    });

    expect(result.deleted).toBe(1);
    expect(existsSync(keepPath)).toBe(true);
    expect(existsSync(stalePath)).toBe(false);

    cleanupTestArtifacts();
  });
});
