-- CreateTable
CREATE TABLE "PMReferral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "referredById" TEXT NOT NULL,
    "referredByName" TEXT NOT NULL,
    "referredByEmail" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "estimatedUnits" INTEGER,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "convertedOrgId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
