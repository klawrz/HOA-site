-- CreateTable
CREATE TABLE "UnitCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "amount" REAL NOT NULL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "chargedOn" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "paymentMethod" TEXT,
    "paidAt" DATETIME,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitCharge_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitCharge_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitCharge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REGULAR_DUES',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "split" TEXT NOT NULL DEFAULT 'EVEN',
    "totalAmount" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "budgetId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assessment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Assessment" ("budgetId", "createdAt", "createdById", "dueDate", "id", "notes", "orgId", "status", "title", "totalAmount", "type", "updatedAt") SELECT "budgetId", "createdAt", "createdById", "dueDate", "id", "notes", "orgId", "status", "title", "totalAmount", "type", "updatedAt" FROM "Assessment";
DROP TABLE "Assessment";
ALTER TABLE "new_Assessment" RENAME TO "Assessment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UnitCharge_orgId_idx" ON "UnitCharge"("orgId");

-- CreateIndex
CREATE INDEX "UnitCharge_unitId_idx" ON "UnitCharge"("unitId");
