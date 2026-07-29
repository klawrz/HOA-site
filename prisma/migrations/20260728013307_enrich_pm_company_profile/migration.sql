/*
  Warnings:

  - You are about to drop the column `address` on the `PropertyManagementCompany` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "PMEmergencyContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PMEmergencyContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PropertyManagementCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PropertyManagementCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
INSERT INTO "new_PropertyManagementCompany" ("createdAt", "createdById", "email", "id", "legalName", "phone", "registrationId", "updatedAt") SELECT "createdAt", "createdById", "email", "id", "legalName", "phone", "registrationId", "updatedAt" FROM "PropertyManagementCompany";
DROP TABLE "PropertyManagementCompany";
ALTER TABLE "new_PropertyManagementCompany" RENAME TO "PropertyManagementCompany";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
