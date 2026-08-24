CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profession" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Expense" ADD COLUMN "employeeId" TEXT;

CREATE INDEX "Employee_userId_fullName_idx" ON "Employee"("userId", "fullName");
CREATE INDEX "Expense_employeeId_deletedAt_date_idx" ON "Expense"("employeeId", "deletedAt", "date");

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
