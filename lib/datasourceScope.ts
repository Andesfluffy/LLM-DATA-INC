import { prisma } from "@/lib/db";

function normalizeTables(tables: string[]): string[] {
  return Array.from(
    new Set(
      tables
        .map((table) => table.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export async function getPersistedDatasourceScope(dataSourceId: string): Promise<string[]> {
  const scopedModel = (prisma as any).dataSourceTableScope;
  if (!scopedModel?.findMany) return [];

  const rows = await scopedModel.findMany({
    where: { dataSourceId },
    orderBy: { tableName: "asc" },
    select: { tableName: true },
  });
  return rows.map((row: { tableName: string }) => row.tableName);
}

export async function replaceDatasourceScope(dataSourceId: string, tables: string[]): Promise<string[]> {
  const normalized = normalizeTables(tables);
  const scopedModel = (prisma as any).dataSourceTableScope;
  if (!scopedModel?.deleteMany || !scopedModel?.createMany) return normalized;

  await prisma.$transaction([
    scopedModel.deleteMany({ where: { dataSourceId } }),
    ...(normalized.length
      ? [
          scopedModel.createMany({
            data: normalized.map((tableName) => ({ dataSourceId, tableName })),
          }),
        ]
      : []),
  ]);

  return normalized;
}
