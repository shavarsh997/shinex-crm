ALTER TABLE "Project" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ProjectMember" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");
CREATE INDEX "Expense_projectId_deletedAt_date_idx" ON "Expense"("projectId", "deletedAt", "date");
CREATE INDEX "Payment_projectId_deletedAt_date_idx" ON "Payment"("projectId", "deletedAt", "date");
CREATE INDEX "ProjectMember_projectId_deletedAt_idx" ON "ProjectMember"("projectId", "deletedAt");
CREATE INDEX "Task_createdById_deletedAt_status_updatedAt_idx" ON "Task"("createdById", "deletedAt", "status", "updatedAt");
