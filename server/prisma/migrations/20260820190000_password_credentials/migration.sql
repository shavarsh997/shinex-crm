-- Add password authentication for Auth.js Credentials provider.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
