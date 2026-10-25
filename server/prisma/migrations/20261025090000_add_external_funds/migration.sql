CREATE TYPE "ExternalFundEntryType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "ExternalFundCategory" AS ENUM ('MATERIAL', 'FUEL', 'TRANSPORT', 'EQUIPMENT', 'SERVICE', 'OTHER');

CREATE TABLE "ExternalFundEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ExternalFundEntryType" NOT NULL,
    "category" "ExternalFundCategory",
    "title" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "counterparty" TEXT,
    "notes" TEXT,
    "clientRequestId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalFundEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExternalFundEntry_positive_amount" CHECK ("amount" > 0),
    CONSTRAINT "ExternalFundEntry_category_matches_type" CHECK (
        ("type" = 'INCOME' AND "category" IS NULL) OR
        ("type" = 'EXPENSE' AND "category" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "ExternalFundEntry_projectId_clientRequestId_key" ON "ExternalFundEntry"("projectId", "clientRequestId");
CREATE INDEX "ExternalFundEntry_projectId_deletedAt_date_idx" ON "ExternalFundEntry"("projectId", "deletedAt", "date");
ALTER TABLE "ExternalFundEntry" ADD CONSTRAINT "ExternalFundEntry_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
