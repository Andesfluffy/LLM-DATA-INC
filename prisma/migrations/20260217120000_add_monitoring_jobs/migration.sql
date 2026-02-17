-- CreateTable
CREATE TABLE "OrgMonitorSchedule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "weeklyReportDay" INTEGER NOT NULL DEFAULT 1,
    "weeklyReportHour" INTEGER NOT NULL DEFAULT 9,
    "weeklyReportMinute" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "revenueDropThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "expenseSpikeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "refundSpikeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "marginDropThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMonitorSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'cron',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "schemaRefreshed" BOOLEAN NOT NULL DEFAULT false,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitorRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorFinding" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currentValue" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "changeRatio" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitorFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "runId" TEXT,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgMonitorSchedule_orgId_key" ON "OrgMonitorSchedule"("orgId");

-- CreateIndex
CREATE INDEX "MonitorRun_orgId_startedAt_idx" ON "MonitorRun"("orgId", "startedAt");

-- CreateIndex
CREATE INDEX "MonitorRun_dataSourceId_startedAt_idx" ON "MonitorRun"("dataSourceId", "startedAt");

-- CreateIndex
CREATE INDEX "MonitorFinding_runId_idx" ON "MonitorFinding"("runId");

-- CreateIndex
CREATE INDEX "MonitorFinding_kind_idx" ON "MonitorFinding"("kind");

-- CreateIndex
CREATE INDEX "KpiSnapshot_orgId_dataSourceId_windowStart_idx" ON "KpiSnapshot"("orgId", "dataSourceId", "windowStart");

-- AddForeignKey
ALTER TABLE "OrgMonitorSchedule" ADD CONSTRAINT "OrgMonitorSchedule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorRun" ADD CONSTRAINT "MonitorRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorRun" ADD CONSTRAINT "MonitorRun_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorFinding" ADD CONSTRAINT "MonitorFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MonitorRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MonitorRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
