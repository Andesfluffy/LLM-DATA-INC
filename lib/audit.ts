import { prisma } from "@/lib/db";

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
  await prisma.queryAudit.create({
    data: {
      userId: p.userId,
      dataSourceId: ds?.url === p.dataSourceUrl ? ds.id : ds?.id || null,
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

