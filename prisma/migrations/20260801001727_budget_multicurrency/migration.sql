-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "approvalExchangeRate" REAL;

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
    "exchangeRateUpdatedAt" DATETIME
);
INSERT INTO "new_Organization" ("addressLine1", "addressLine2", "bankAccountName", "bankName", "bankPaymentInstructions", "bankSigningAuthority", "city", "country", "createdAt", "id", "name", "onboardingComplete", "postalCode", "reserveHeldAt", "reservePolicy", "reserveTarget", "slug", "state", "updatedAt") SELECT "addressLine1", "addressLine2", "bankAccountName", "bankName", "bankPaymentInstructions", "bankSigningAuthority", "city", "country", "createdAt", "id", "name", "onboardingComplete", "postalCode", "reserveHeldAt", "reservePolicy", "reserveTarget", "slug", "state", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
