-- CreateTable
CREATE TABLE "DataSourceTableScope" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSourceTableScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSourceTableScope_dataSourceId_idx" ON "DataSourceTableScope"("dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "DataSourceTableScope_dataSourceId_tableName_key" ON "DataSourceTableScope"("dataSourceId", "tableName");

-- AddForeignKey
ALTER TABLE "DataSourceTableScope" ADD CONSTRAINT "DataSourceTableScope_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
