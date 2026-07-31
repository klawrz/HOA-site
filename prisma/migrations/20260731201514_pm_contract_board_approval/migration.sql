/*
  Warnings:

  - Added the required column `createdById` to the `PMContract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `responsibilities` to the `PMContract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `terminationTerms` to the `PMContract` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PMContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "responsibilities" TEXT NOT NULL,
    "terminationTerms" TEXT NOT NULL,
    "terms" TEXT,
    "fileUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "meetingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PMContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PropertyManagementCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PMContract_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PMContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PMContract_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PMContract_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PMContract" ("companyId", "createdAt", "endDate", "fileUrl", "id", "orgId", "startDate", "status", "terms", "updatedAt") SELECT "companyId", "createdAt", "endDate", "fileUrl", "id", "orgId", "startDate", "status", "terms", "updatedAt" FROM "PMContract";
DROP TABLE "PMContract";
ALTER TABLE "new_PMContract" RENAME TO "PMContract";
CREATE TABLE "new_PropertyManagementCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL DEFAULT 'COMPANY',
    "legalName" TEXT NOT NULL,
    "registrationId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactPhone" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropertyManagementCompany_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PropertyManagementCompany" ("addressLine1", "addressLine2", "city", "country", "createdAt", "createdById", "email", "id", "legalName", "phone", "postalCode", "primaryContactEmail", "primaryContactName", "primaryContactPhone", "registrationId", "state", "updatedAt") SELECT "addressLine1", "addressLine2", "city", "country", "createdAt", "createdById", "email", "id", "legalName", "phone", "postalCode", "primaryContactEmail", "primaryContactName", "primaryContactPhone", "registrationId", "state", "updatedAt" FROM "PropertyManagementCompany";
DROP TABLE "PropertyManagementCompany";
ALTER TABLE "new_PropertyManagementCompany" RENAME TO "PropertyManagementCompany";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
