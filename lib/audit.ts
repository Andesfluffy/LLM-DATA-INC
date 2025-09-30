import { prisma } from "@/lib/db";
import { getDataSourceConnectionUrl } from "@/lib/datasourceSecrets";

type Params = {
  userId: string;
  dataSourceUrl: string;
  nlQuery: string | null;
  generatedSql: string | null;
  executedSql: string | null;
  status: string;
  error: string | null;
  durationMs: number | null;
  rowCount: number | null;
};

export async function recordAudit(p: Params) {
  // Link to DataSource if exists for the owner/dataSourceUrl pair (best-effort)
  const ds = await prisma.dataSource.findFirst({ where: { ownerId: p.userId } });
  let matchesUrl = false;
  if (ds) {
    try {
      matchesUrl = getDataSourceConnectionUrl(ds) === p.dataSourceUrl;
    } catch (error) {
      console.warn("Failed to resolve data source URL during audit", error);
    }
  }
  await prisma.queryAudit.create({
    data: {
      userId: p.userId,
      dataSourceId: matchesUrl && ds ? ds.id : null,
      nlQuery: p.nlQuery,
      generatedSql: p.generatedSql,
      executedSql: p.executedSql,
      status: p.status,
      error: p.error || undefined,
      durationMs: p.durationMs || undefined,
      rowCount: p.rowCount || undefined,
    }
  });
}

