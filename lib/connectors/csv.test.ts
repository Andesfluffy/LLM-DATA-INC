import { describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { csvConnector } from "@/lib/connectors/csv";

function makeCsvDatasource(csv: string, metadataOverrides: Record<string, unknown> = {}) {
  return {
    id: "csv_ds",
    name: "Uploaded Sheet",
    type: "csv",
    host: null,
    port: null,
    database: null,
    user: null,
    passwordCiphertext: null,
    passwordIv: null,
    passwordTag: null,
    urlCiphertext: null,
    urlIv: null,
    urlTag: null,
    orgId: "org_test",
    ownerId: "user_test",
    metadata: {
      storage: "inline_base64",
      csvBase64: Buffer.from(csv, "utf-8").toString("base64"),
      tableName: "sales_data",
      delimiter: ",",
      ...metadataOverrides,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
}

describe("csv connector", () => {
  it("infers numeric and datetime columns from inline csv", async () => {
    const csv = [
      "order_id,amount,qty,created_at,status",
      "1001,199.95,2,2026-01-01T10:00:00Z,paid",
      "1002,10.50,1,2026-01-02T11:30:00Z,paid",
      "1003,50,4,2026-01-03T14:00:00Z,refund",
    ].join("\n");

    const client = await csvConnector.createClient(makeCsvDatasource(csv));
    try {
      const schema = await client.getSchema();
      expect(schema).toContain("sales_data.order_id INTEGER");
      expect(schema).toContain("sales_data.amount REAL");
      expect(schema).toContain("sales_data.qty INTEGER");
      expect(schema).toContain("sales_data.created_at DATETIME");

      const result = await client.executeQuery("SELECT SUM(amount) AS total FROM sales_data");
      expect(result.rowCount).toBe(1);
      expect(result.fields).toContain("total");
      expect(typeof result.rows[0]?.total).toBe("number");
    } finally {
      await client.disconnect();
    }
  });

  it("validates metadata when creating csv connector params", () => {
    const valid = csvConnector.validateParams({
      metadata: { csvBase64: Buffer.from("a,b\n1,2", "utf-8").toString("base64") },
    });
    expect(valid).toEqual({ ok: true });

    const invalid = csvConnector.validateParams({ metadata: {} });
    expect(invalid.ok).toBe(false);
  });

  it("supports semicolon-delimited csv when delimiter metadata is set", async () => {
    const csv = [
      "order_id;amount;status",
      "1;25.50;paid",
      "2;10.00;paid",
      "3;3.75;refund",
    ].join("\n");

    const client = await csvConnector.createClient(
      makeCsvDatasource(csv, { delimiter: ";" })
    );
    try {
      const result = await client.executeQuery(
        "SELECT COUNT(*) AS total_paid FROM sales_data WHERE status = 'paid'"
      );
      expect(result.rowCount).toBe(1);
      expect(result.rows[0]?.total_paid).toBe(2);
    } finally {
      await client.disconnect();
    }
  });

  it("reads csv from filesystem metadata storage", async () => {
    const uploadsDir = join(process.cwd(), "uploads");
    mkdirSync(uploadsDir, { recursive: true });

    const fileName = `vitest_${Date.now()}_${Math.random().toString(16).slice(2)}.csv`;
    const relativePath = join("uploads", fileName);
    const fullPath = join(process.cwd(), relativePath);
    const csv = ["name,score", "alice,10", "bob,20"].join("\n");
    writeFileSync(fullPath, csv, "utf-8");

    const client = await csvConnector.createClient(
      makeCsvDatasource("", {
        storage: "filesystem",
        filePath: relativePath,
        csvBase64: undefined,
        tableName: "uploaded_scores",
      })
    );

    try {
      const result = await client.executeQuery("SELECT AVG(score) AS avg_score FROM uploaded_scores");
      expect(result.rowCount).toBe(1);
      expect(result.rows[0]?.avg_score).toBe(15);
    } finally {
      await client.disconnect();
      rmSync(fullPath, { force: true });
    }
  });
});
