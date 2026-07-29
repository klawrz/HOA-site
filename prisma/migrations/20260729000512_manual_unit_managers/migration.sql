-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UnitManagerAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitManagerAssignment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitManagerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UnitManagerAssignment" ("createdAt", "id", "unitId", "userId") SELECT "createdAt", "id", "unitId", "userId" FROM "UnitManagerAssignment";
DROP TABLE "UnitManagerAssignment";
ALTER TABLE "new_UnitManagerAssignment" RENAME TO "UnitManagerAssignment";
CREATE UNIQUE INDEX "UnitManagerAssignment_unitId_userId_key" ON "UnitManagerAssignment"("unitId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
