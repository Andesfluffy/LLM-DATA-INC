import { prisma } from "@/lib/db";
import { redactDataSourceSecrets } from "@/lib/datasourceSecrets";

export async function getUserDataSources(userId: string) {
  const rows = await prisma.dataSource.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" } });
  return rows.map((row) => redactDataSourceSecrets(row));
}
