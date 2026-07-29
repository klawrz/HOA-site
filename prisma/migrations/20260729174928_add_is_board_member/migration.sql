-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "phone" TEXT,
    "company" TEXT,
    "category" TEXT,
    "orgId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isBoardMember" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "bio" TEXT,
    "specialties" TEXT,
    "yearsExperience" INTEGER,
    "directoryVisible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("bio", "category", "company", "createdAt", "directoryVisible", "email", "headline", "id", "name", "orgId", "password", "phone", "role", "specialties", "updatedAt", "yearsExperience") SELECT "bio", "category", "company", "createdAt", "directoryVisible", "email", "headline", "id", "name", "orgId", "password", "phone", "role", "specialties", "updatedAt", "yearsExperience" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
