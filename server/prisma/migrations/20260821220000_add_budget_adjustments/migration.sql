-- CreateEnum
CREATE TYPE "BudgetAdjustmentType" AS ENUM ('INCREASE', 'DECREASE');

-- CreateTable
CREATE TABLE "BudgetAdjustment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "BudgetAdjustmentType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetAdjustment_projectId_date_idx" ON "BudgetAdjustment"("projectId", "date");

-- AddForeignKey
ALTER TABLE "BudgetAdjustment"
ADD CONSTRAINT "BudgetAdjustment_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
