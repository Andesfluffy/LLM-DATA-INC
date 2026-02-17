import { prisma } from "@/lib/db";

type AuditEvent = {
  orgId: string;
  userId?: string | null;
  action: string;
  question?: string | null;
  sql?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  durationMs?: number | null;
  rowCount?: number | null;
};

export async function logAuditEvent(event: AuditEvent) {
  await prisma.auditLog.create({
    data: {
      orgId: event.orgId,
      userId: event.userId ?? null,
      action: event.action,
      question: event.question ?? null,
      sql: event.sql ?? null,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      metadata: event.metadata ?? undefined,
      durationMs: event.durationMs ?? undefined,
      rowCount: event.rowCount ?? undefined,
    },
  });
}
