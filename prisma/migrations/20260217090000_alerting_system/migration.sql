-- Create enums
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'IN_APP');
CREATE TYPE "AlertEventStatus" AS ENUM ('SENT', 'SUPPRESSED_COOLDOWN', 'DELIVERY_FAILED');
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- Create alert rules table
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channel" "AlertChannel" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- Create alert events table
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "AlertEventStatus" NOT NULL,
    "suppressReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- Create delivery attempts table
CREATE TABLE "AlertDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "alertEventId" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "providerId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- In-app feed notifications
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "alertEventId" TEXT,
    "recipient" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "AlertRule_orgId_metric_isEnabled_idx" ON "AlertRule"("orgId", "metric", "isEnabled");
CREATE INDEX "AlertEvent_orgId_dedupKey_createdAt_idx" ON "AlertEvent"("orgId", "dedupKey", "createdAt");
CREATE INDEX "AlertEvent_ruleId_dedupKey_sentAt_idx" ON "AlertEvent"("ruleId", "dedupKey", "sentAt");
CREATE INDEX "AlertDeliveryAttempt_alertEventId_attemptedAt_idx" ON "AlertDeliveryAttempt"("alertEventId", "attemptedAt");
CREATE INDEX "AlertDeliveryAttempt_channel_attemptedAt_idx" ON "AlertDeliveryAttempt"("channel", "attemptedAt");
CREATE INDEX "InAppNotification_orgId_recipient_createdAt_idx" ON "InAppNotification"("orgId", "recipient", "createdAt");
CREATE INDEX "InAppNotification_alertEventId_idx" ON "InAppNotification"("alertEventId");

-- FKs
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertDeliveryAttempt" ADD CONSTRAINT "AlertDeliveryAttempt_alertEventId_fkey" FOREIGN KEY ("alertEventId") REFERENCES "AlertEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_alertEventId_fkey" FOREIGN KEY ("alertEventId") REFERENCES "AlertEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
