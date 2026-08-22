ALTER TABLE "Project" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "BudgetAdjustment" ADD COLUMN "clientRequestId" TEXT;

-- Repair any cached totals that may have drifted before per-project locking
-- was introduced. Ledgers are the source of truth.
UPDATE "Project" AS project
SET "spentAmount" = COALESCE((
  SELECT SUM(expense."amount") FROM "Expense" AS expense
  WHERE expense."projectId" = project."id" AND expense."deletedAt" IS NULL
), 0);

UPDATE "Project" AS project
SET "receivedAmount" = COALESCE((
  SELECT SUM(payment."amount") FROM "Payment" AS payment
  WHERE payment."projectId" = project."id" AND payment."deletedAt" IS NULL
), 0);

-- Old non-salary records could retain an employee name after a category edit.
UPDATE "Expense" SET "employeeName" = NULL WHERE "type" <> 'EMPLOYEE'::"ExpenseType";
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employee_requires_name"
  CHECK ("type" <> 'EMPLOYEE'::"ExpenseType" OR NULLIF(BTRIM("employeeName"), '') IS NOT NULL);

CREATE UNIQUE INDEX "Project_clientRequestId_key" ON "Project"("clientRequestId");
CREATE UNIQUE INDEX "Expense_clientRequestId_key" ON "Expense"("clientRequestId");
CREATE UNIQUE INDEX "Payment_clientRequestId_key" ON "Payment"("clientRequestId");
CREATE UNIQUE INDEX "BudgetAdjustment_clientRequestId_key" ON "BudgetAdjustment"("clientRequestId");

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "projectId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
