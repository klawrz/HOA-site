-- CreateTable
CREATE TABLE "OrgVerificationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "legalEntityName" TEXT,
    "registrationNumber" TEXT,
    "evidenceNotes" TEXT,
    "evidenceFileUrl" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedByEmail" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgVerificationRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "suspendedAt" DATETIME,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "legalEntityName" TEXT,
    "boardApprovalStatus" TEXT NOT NULL DEFAULT 'NOT_YET_DECIDED',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PROVISIONAL',
    "verifiedAt" DATETIME,
    "verifiedByName" TEXT,
    "verifiedByEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reserveTarget" REAL,
    "reservePolicy" TEXT,
    "reserveHeldAt" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "bankPhone" TEXT,
    "bankAccountName" TEXT,
    "bankSigningAuthority" TEXT,
    "bankPaymentInstructions" TEXT,
    "bankContactName" TEXT,
    "bankContactPhone" TEXT,
    "bankContactEmail" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "currentExchangeRate" REAL,
    "exchangeRateUpdatedAt" DATETIME,
    "occupancyVisibilityPolicy" TEXT,
    "rentalPoolGuidelines" TEXT,
    "unitLabel" TEXT NOT NULL DEFAULT 'Unit',
    "accountNumber" TEXT,
    "pricingPlan" TEXT,
    "billingExpiry" DATETIME,
    "paymentMethod" TEXT,
    "accountOwnerName" TEXT,
    "accountOwnerTitle" TEXT,
    "accountOwnerEmail" TEXT,
    "accountOwnerPhone" TEXT,
    "accountOwnerAddressLine1" TEXT,
    "accountOwnerAddressLine2" TEXT,
    "accountOwnerCity" TEXT,
    "accountOwnerState" TEXT,
    "accountOwnerPostalCode" TEXT,
    "accountOwnerCountry" TEXT,
    "altContactName" TEXT,
    "altContactEmail" TEXT,
    "altContactPhone" TEXT
);
INSERT INTO "new_Organization" ("accountNumber", "accountOwnerAddressLine1", "accountOwnerAddressLine2", "accountOwnerCity", "accountOwnerCountry", "accountOwnerEmail", "accountOwnerName", "accountOwnerPhone", "accountOwnerPostalCode", "accountOwnerState", "accountOwnerTitle", "addressLine1", "addressLine2", "altContactEmail", "altContactName", "altContactPhone", "bankAccountName", "bankAddress", "bankContactEmail", "bankContactName", "bankContactPhone", "bankName", "bankPaymentInstructions", "bankPhone", "bankSigningAuthority", "baseCurrency", "billingExpiry", "boardApprovalStatus", "city", "country", "createdAt", "currentExchangeRate", "exchangeRateUpdatedAt", "id", "legalEntityName", "name", "occupancyVisibilityPolicy", "onboardingComplete", "paymentMethod", "postalCode", "pricingPlan", "rentalPoolGuidelines", "reserveHeldAt", "reservePolicy", "reserveTarget", "slug", "state", "suspendedAt", "unitLabel", "updatedAt") SELECT "accountNumber", "accountOwnerAddressLine1", "accountOwnerAddressLine2", "accountOwnerCity", "accountOwnerCountry", "accountOwnerEmail", "accountOwnerName", "accountOwnerPhone", "accountOwnerPostalCode", "accountOwnerState", "accountOwnerTitle", "addressLine1", "addressLine2", "altContactEmail", "altContactName", "altContactPhone", "bankAccountName", "bankAddress", "bankContactEmail", "bankContactName", "bankContactPhone", "bankName", "bankPaymentInstructions", "bankPhone", "bankSigningAuthority", "baseCurrency", "billingExpiry", "boardApprovalStatus", "city", "country", "createdAt", "currentExchangeRate", "exchangeRateUpdatedAt", "id", "legalEntityName", "name", "occupancyVisibilityPolicy", "onboardingComplete", "paymentMethod", "postalCode", "pricingPlan", "rentalPoolGuidelines", "reserveHeldAt", "reservePolicy", "reserveTarget", "slug", "state", "suspendedAt", "unitLabel", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
