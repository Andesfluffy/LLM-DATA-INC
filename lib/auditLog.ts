import { prisma } from "@/lib/db";

type AuditEvent = {
  userId: string;
  action: string;
  sql?: string | null;
  question?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  durationMs?: number | null;
  rowCount?: number | null;
};

export async function logAuditEvent(event: AuditEvent) {
  try {
    await prisma.queryAudit.create({
      data: {
        userId: event.userId,
        dataSourceId: event.targetId ?? null,
        nlQuery: event.question ?? null,
        executedSql: event.sql ?? null,
        generatedSql: event.sql ?? null,
        status: event.action,
        durationMs: event.durationMs ?? undefined,
        rowCount: event.rowCount ?? undefined,
      },
    });
  } catch (e) {
    console.error("[auditLog] Failed to log audit event:", e);
  }
}
