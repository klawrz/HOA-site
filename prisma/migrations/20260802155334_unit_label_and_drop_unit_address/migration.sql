/*
  Warnings:

  - You are about to drop the column `addressLine1` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the column `addressLine2` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Unit` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reserveTarget" REAL,
    "reservePolicy" TEXT,
    "reserveHeldAt" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankSigningAuthority" TEXT,
    "bankPaymentInstructions" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "currentExchangeRate" REAL,
    "exchangeRateUpdatedAt" DATETIME,
    "occupancyVisibilityPolicy" TEXT,
    "rentalPoolGuidelines" TEXT,
    "unitLabel" TEXT NOT NULL DEFAULT 'Unit'
);
INSERT INTO "new_Organization" ("addressLine1", "addressLine2", "bankAccountName", "bankName", "bankPaymentInstructions", "bankSigningAuthority", "baseCurrency", "city", "country", "createdAt", "currentExchangeRate", "exchangeRateUpdatedAt", "id", "name", "occupancyVisibilityPolicy", "onboardingComplete", "postalCode", "rentalPoolGuidelines", "reserveHeldAt", "reservePolicy", "reserveTarget", "slug", "state", "updatedAt") SELECT "addressLine1", "addressLine2", "bankAccountName", "bankName", "bankPaymentInstructions", "bankSigningAuthority", "baseCurrency", "city", "country", "createdAt", "currentExchangeRate", "exchangeRateUpdatedAt", "id", "name", "occupancyVisibilityPolicy", "onboardingComplete", "postalCode", "rentalPoolGuidelines", "reserveHeldAt", "reservePolicy", "reserveTarget", "slug", "state", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE TABLE "new_Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "building" TEXT,
    "floor" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" REAL,
    "sqft" INTEGER,
    "description" TEXT,
    "civicRoll" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "selfManaged" BOOLEAN NOT NULL DEFAULT true,
    "accessCode" TEXT,
    "accessCodeNotes" TEXT,
    "allocationPercent" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Unit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Unit" ("accessCode", "accessCodeNotes", "allocationPercent", "bathrooms", "bedrooms", "building", "civicRoll", "createdAt", "description", "floor", "id", "number", "orgId", "selfManaged", "sqft", "status", "updatedAt") SELECT "accessCode", "accessCodeNotes", "allocationPercent", "bathrooms", "bedrooms", "building", "civicRoll", "createdAt", "description", "floor", "id", "number", "orgId", "selfManaged", "sqft", "status", "updatedAt" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
CREATE UNIQUE INDEX "Unit_orgId_number_key" ON "Unit"("orgId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
