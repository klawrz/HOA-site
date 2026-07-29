/*
  Warnings:

  - Added the required column `createdById` to the `PropertyManagementCompany` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PropertyManagementCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalName" TEXT NOT NULL,
    "registrationId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropertyManagementCompany_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PropertyManagementCompany" ("address", "createdAt", "email", "id", "legalName", "phone", "registrationId", "updatedAt") SELECT "address", "createdAt", "email", "id", "legalName", "phone", "registrationId", "updatedAt" FROM "PropertyManagementCompany";
DROP TABLE "PropertyManagementCompany";
ALTER TABLE "new_PropertyManagementCompany" RENAME TO "PropertyManagementCompany";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
