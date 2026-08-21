-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'FROZEN', 'COMPLETED');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "frozenAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Project_userId_status_updatedAt_idx" ON "Project"("userId", "status", "updatedAt");
