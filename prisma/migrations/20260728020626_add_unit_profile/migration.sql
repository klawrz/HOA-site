-- AlterTable
ALTER TABLE "Unit" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "Unit" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "Unit" ADD COLUMN "city" TEXT;
ALTER TABLE "Unit" ADD COLUMN "country" TEXT;
ALTER TABLE "Unit" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Unit" ADD COLUMN "state" TEXT;

-- CreateTable
CREATE TABLE "UnitContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitContact_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnitManagerAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitManagerAssignment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitManagerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnitManagerGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'VIEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitManagerGrant_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "UnitManagerAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UnitOwnership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "rentalPolicy" TEXT NOT NULL DEFAULT 'NOT_RENTING',
    "notes" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "since" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "divestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitOwnership_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitOwnership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UnitOwnership" ("createdAt", "id", "notes", "ownerId", "rentalPolicy", "since", "unitId", "updatedAt") SELECT "createdAt", "id", "notes", "ownerId", "rentalPolicy", "since", "unitId", "updatedAt" FROM "UnitOwnership";
DROP TABLE "UnitOwnership";
ALTER TABLE "new_UnitOwnership" RENAME TO "UnitOwnership";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UnitManagerAssignment_unitId_userId_key" ON "UnitManagerAssignment"("unitId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitManagerGrant_assignmentId_area_key" ON "UnitManagerGrant"("assignmentId", "area");
