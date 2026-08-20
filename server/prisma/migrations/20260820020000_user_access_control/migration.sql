-- CreateEnum
CREATE TYPE "UserApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "approvalStatus" "UserApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "approvalNote" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3);
