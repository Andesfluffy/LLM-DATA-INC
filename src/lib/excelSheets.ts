export function isExcelFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export async function listExcelSheets(file: File): Promise<string[]> {
  if (!isExcelFileName(file.name)) return [];

  const bytes = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, { type: "array" });

  return workbook.SheetNames.filter((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return Boolean(sheet && sheet["!ref"]);
  });
}
