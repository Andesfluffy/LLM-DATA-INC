import type { DataSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redactDataSourceSecrets } from "@/lib/datasourceSecrets";

export async function getUserDataSources(userId: string) {
  const rows: DataSource[] = await prisma.dataSource.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row: DataSource) => redactDataSourceSecrets(row));
}
