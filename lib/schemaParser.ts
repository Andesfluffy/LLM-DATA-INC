export type ParsedColumn = {
  name: string;
  type: string;
  isNumeric: boolean;
  isTemporal: boolean;
};

export type ParsedTable = {
  name: string;
  columns: ParsedColumn[];
};

const NUMERIC_TYPES = new Set([
  "integer", "int", "int2", "int4", "int8", "smallint", "bigint",
  "numeric", "decimal", "real", "float", "float4", "float8",
  "double precision", "double", "money", "serial", "bigserial",
  "tinyint", "mediumint",
]);

const TEMPORAL_TYPES = new Set([
  "date", "time", "timestamp", "timestamptz",
  "timestamp without time zone", "timestamp with time zone",
  "datetime", "year", "interval",
]);

function classifyType(rawType: string): { isNumeric: boolean; isTemporal: boolean } {
  const t = rawType.toLowerCase().trim();
  return {
    isNumeric: NUMERIC_TYPES.has(t),
    isTemporal: TEMPORAL_TYPES.has(t),
  };
}

/**
 * Parse the compact DDL format produced by connector getSchema():
 *   orders.id integer
 *   orders.total numeric
 *   customers.name text
 *
 * Into structured ParsedTable[].
 */
export function parseCompactSchema(ddl: string): ParsedTable[] {
  const tableMap = new Map<string, ParsedColumn[]>();

  for (const line of ddl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: [schema.]table.column data_type
    // Find last space to split off the type
    const lastSpace = trimmed.lastIndexOf(" ");
    if (lastSpace === -1) continue;

    const qualifiedCol = trimmed.slice(0, lastSpace).trim();
    const dataType = trimmed.slice(lastSpace + 1).trim();

    // Split qualified column: could be "schema.table.col" or "table.col"
    const dotParts = qualifiedCol.split(".");
    if (dotParts.length < 2) continue;

    const colName = dotParts.pop()!;
    const tableName = dotParts.join("."); // keeps "schema.table" or just "table"

    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, []);
    }

    const { isNumeric, isTemporal } = classifyType(dataType);
    tableMap.get(tableName)!.push({ name: colName, type: dataType, isNumeric, isTemporal });
  }

  return Array.from(tableMap.entries()).map(([name, columns]) => ({ name, columns }));
}
