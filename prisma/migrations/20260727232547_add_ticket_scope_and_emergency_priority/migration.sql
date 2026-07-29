-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TroubleTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "unitId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'UNIT',
    "submittedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "TroubleTicket_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TroubleTicket_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TroubleTicket_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TroubleTicket" ("createdAt", "description", "id", "orgId", "priority", "resolvedAt", "status", "submittedById", "title", "unitId", "updatedAt") SELECT "createdAt", "description", "id", "orgId", "priority", "resolvedAt", "status", "submittedById", "title", "unitId", "updatedAt" FROM "TroubleTicket";
DROP TABLE "TroubleTicket";
ALTER TABLE "new_TroubleTicket" RENAME TO "TroubleTicket";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
