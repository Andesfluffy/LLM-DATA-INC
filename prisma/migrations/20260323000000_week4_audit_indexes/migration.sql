-- Week 4 audit: add indexes on QueryAudit.status for admin stats performance
CREATE INDEX IF NOT EXISTS "QueryAudit_status_idx" ON "QueryAudit"("status");
CREATE INDEX IF NOT EXISTS "QueryAudit_status_createdAt_idx" ON "QueryAudit"("status", "createdAt");
