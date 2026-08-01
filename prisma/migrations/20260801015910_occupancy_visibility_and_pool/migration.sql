-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "occupancyVisibilityPolicy" TEXT;
ALTER TABLE "Organization" ADD COLUMN "rentalPoolGuidelines" TEXT;

-- CreateTable
CREATE TABLE "OccupancyShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "OccupancyShareLink_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OccupancyShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "occupancyVisibleToBoard" BOOLEAN NOT NULL DEFAULT false,
    "occupancyVisibleToPM" BOOLEAN NOT NULL DEFAULT false,
    "rentalPoolMember" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UnitOwnership_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitOwnership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UnitOwnership" ("createdAt", "divestedAt", "id", "isCurrent", "notes", "ownerId", "rentalPolicy", "since", "unitId", "updatedAt") SELECT "createdAt", "divestedAt", "id", "isCurrent", "notes", "ownerId", "rentalPolicy", "since", "unitId", "updatedAt" FROM "UnitOwnership";
DROP TABLE "UnitOwnership";
ALTER TABLE "new_UnitOwnership" RENAME TO "UnitOwnership";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OccupancyShareLink_token_key" ON "OccupancyShareLink"("token");
