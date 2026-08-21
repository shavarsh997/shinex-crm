-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "employeeName" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_createdById_status_updatedAt_idx" ON "Task"("createdById", "status", "updatedAt");
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

-- AddForeignKey
ALTER TABLE "Task"
ADD CONSTRAINT "Task_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
