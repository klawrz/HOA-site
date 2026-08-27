-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeyDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT,
    "chairpersonName" TEXT,
    "agenda" TEXT,
    "proxyProcess" TEXT,
    "proxyFormUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "meetingId" TEXT,
    CONSTRAINT "KeyDate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeyDate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KeyDate_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KeyDate" ("agenda", "chairpersonName", "createdAt", "createdById", "date", "id", "location", "notes", "orgId", "proxyFormUrl", "proxyProcess", "type", "updatedAt") SELECT "agenda", "chairpersonName", "createdAt", "createdById", "date", "id", "location", "notes", "orgId", "proxyFormUrl", "proxyProcess", "type", "updatedAt" FROM "KeyDate";
DROP TABLE "KeyDate";
ALTER TABLE "new_KeyDate" RENAME TO "KeyDate";
CREATE UNIQUE INDEX "KeyDate_meetingId_key" ON "KeyDate"("meetingId");
CREATE UNIQUE INDEX "KeyDate_orgId_type_key" ON "KeyDate"("orgId", "type");
CREATE TABLE "new_Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "date" DATETIME NOT NULL,
    "location" TEXT,
    "agenda" TEXT,
    "minutes" TEXT,
    "attendees" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Meeting_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Meeting" ("agenda", "attendees", "createdAt", "date", "id", "location", "minutes", "orgId", "title", "updatedAt") SELECT "agenda", "attendees", "createdAt", "date", "id", "location", "minutes", "orgId", "title", "updatedAt" FROM "Meeting";
DROP TABLE "Meeting";
ALTER TABLE "new_Meeting" RENAME TO "Meeting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
