-- CreateTable
CREATE TABLE "WeeklyBusinessReport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "healthScore" INTEGER,
    "summary" TEXT,
    "markdownContent" TEXT NOT NULL,
    "jsonContent" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyBusinessReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSection" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "jsonData" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDeliveryLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "deliveredTo" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyBusinessReport_orgId_periodStart_periodEnd_idx" ON "WeeklyBusinessReport"("orgId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyBusinessReport_orgId_periodStart_periodEnd_key" ON "WeeklyBusinessReport"("orgId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ReportSection_reportId_sortOrder_idx" ON "ReportSection"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "ReportDeliveryLog_orgId_createdAt_idx" ON "ReportDeliveryLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportDeliveryLog_reportId_idx" ON "ReportDeliveryLog"("reportId");

-- AddForeignKey
ALTER TABLE "WeeklyBusinessReport" ADD CONSTRAINT "WeeklyBusinessReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSection" ADD CONSTRAINT "ReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyBusinessReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDeliveryLog" ADD CONSTRAINT "ReportDeliveryLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDeliveryLog" ADD CONSTRAINT "ReportDeliveryLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyBusinessReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
