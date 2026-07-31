-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "bankPaymentInstructions" TEXT;
ALTER TABLE "Organization" ADD COLUMN "bankSigningAuthority" TEXT;

-- CreateTable
CREATE TABLE "KeyContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeyContact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
