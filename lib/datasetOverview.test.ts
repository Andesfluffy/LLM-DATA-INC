import { describe, expect, it } from "vitest";

import { buildDatasetOverviewResult, isDatasetOverviewQuestion } from "@/lib/datasetOverview";

describe("dataset overview helpers", () => {
  it("detects non-technical overview prompts", () => {
    expect(isDatasetOverviewQuestion("What data do I have?")).toBe(true);
    expect(isDatasetOverviewQuestion("tell me what this csv is about")).toBe(true);
    expect(isDatasetOverviewQuestion("overview of this database")).toBe(true);
    expect(isDatasetOverviewQuestion("top customers by revenue")).toBe(false);
  });

  it("builds an overview table from compact schema", () => {
    const schema = [
      "sales.id integer",
      "sales.amount numeric",
      "sales.created_at timestamp",
      "customers.id integer",
      "customers.name text",
    ].join("\n");

    const overview = buildDatasetOverviewResult(schema);
    expect(overview.fields).toEqual([
      "table",
      "columnCount",
      "numericColumns",
      "temporalColumns",
      "sampleColumns",
    ]);
    expect(overview.rowCount).toBe(2);
    expect(overview.rows[0]).toMatchObject({
      table: "sales",
      columnCount: 3,
      numericColumns: 2,
      temporalColumns: 1,
    });
  });
});

