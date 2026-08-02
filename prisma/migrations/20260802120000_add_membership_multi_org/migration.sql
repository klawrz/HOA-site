-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isBoardMember" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");

-- Backfill: one Membership row per existing User with a non-null orgId,
-- carrying over its role/isBoardMember before those columns are dropped below.
INSERT INTO "Membership" ("id", "userId", "orgId", "role", "isBoardMember", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "orgId", "role", "isBoardMember", "createdAt"
FROM "User"
WHERE "orgId" IS NOT NULL;

-- RedefineTables: drop role/orgId/isBoardMember off User (now backfilled into
-- Membership above), add isPlatformAdmin.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "bio" TEXT,
    "specialties" TEXT,
    "yearsExperience" INTEGER,
    "directoryVisible" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_User" ("id", "name", "email", "password", "phone", "company", "category", "createdAt", "updatedAt", "headline", "bio", "specialties", "yearsExperience", "directoryVisible")
SELECT "id", "name", "email", "password", "phone", "company", "category", "createdAt", "updatedAt", "headline", "bio", "specialties", "yearsExperience", "directoryVisible" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
