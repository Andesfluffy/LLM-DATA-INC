-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "onboardingComplete";

-- DropTable
DROP TABLE "public"."Account";

-- DropTable
DROP TABLE "public"."VerificationToken";

-- CreateTable
CREATE TABLE "public"."SavedQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedQuery_userId_idx" ON "public"."SavedQuery"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedQuery_userId_question_key" ON "public"."SavedQuery"("userId", "question");

-- CreateIndex
CREATE INDEX "DataSource_ownerId_idx" ON "public"."DataSource"("ownerId");

-- CreateIndex
CREATE INDEX "QueryAudit_userId_idx" ON "public"."QueryAudit"("userId");

-- CreateIndex
CREATE INDEX "QueryAudit_dataSourceId_idx" ON "public"."QueryAudit"("dataSourceId");

-- CreateIndex
CREATE INDEX "QueryAudit_createdAt_idx" ON "public"."QueryAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."SavedQuery" ADD CONSTRAINT "SavedQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
