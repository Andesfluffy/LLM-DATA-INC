import { parseCompactSchema } from "@/lib/schemaParser";

type OverviewResult = {
  fields: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
};

const OVERVIEW_PATTERNS = [
  /\bwhat\s+data\s+do\s+i\s+have\b/i,
  /\bwhat\s+is\s+this\s+(database|dataset|csv|spreadsheet)\s+about\b/i,
  /\bwhat\s+this\s+(database|dataset|csv|spreadsheet)\s+is\s+about\b/i,
  /\bsummary\s+of\s+(this|the)\s+(database|dataset|csv|spreadsheet)\b/i,
  /\boverview\s+of\s+(this|the)\s+(database|dataset|csv|spreadsheet)\b/i,
  /\bwhat\s+am\s+i\s+looking\s+at\b/i,
  /\bdescribe\s+(this|the)\s+(database|dataset|csv|spreadsheet)\b/i,
];

export function isDatasetOverviewQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  return OVERVIEW_PATTERNS.some((pattern) => pattern.test(q));
}

export function buildDatasetOverviewResult(schema: string): OverviewResult {
  const tables = parseCompactSchema(schema);
  if (tables.length === 0) {
    return {
      fields: ["summary"],
      rows: [{ summary: "No tables or columns were detected in this data source yet." }],
      rowCount: 1,
    };
  }

  const rows = tables.map((table) => {
    const numericColumns = table.columns.filter((col) => col.isNumeric).length;
    const temporalColumns = table.columns.filter((col) => col.isTemporal).length;
    const sampleColumns = table.columns.slice(0, 6).map((col) => col.name).join(", ");
    return {
      table: table.name,
      columnCount: table.columns.length,
      numericColumns,
      temporalColumns,
      sampleColumns,
    };
  });

  return {
    fields: ["table", "columnCount", "numericColumns", "temporalColumns", "sampleColumns"],
    rows,
    rowCount: rows.length,
  };
}
