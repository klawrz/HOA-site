-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    CONSTRAINT "Unit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Unit" ("addressLine1", "addressLine2", "bathrooms", "bedrooms", "building", "city", "civicRoll", "country", "createdAt", "description", "floor", "id", "number", "orgId", "postalCode", "sqft", "state", "status", "updatedAt") SELECT "addressLine1", "addressLine2", "bathrooms", "bedrooms", "building", "city", "civicRoll", "country", "createdAt", "description", "floor", "id", "number", "orgId", "postalCode", "sqft", "state", "status", "updatedAt" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
CREATE UNIQUE INDEX "Unit_orgId_number_key" ON "Unit"("orgId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
