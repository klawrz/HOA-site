-- CreateTable
CREATE TABLE "BoardIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GOVERNANCE',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'ATTENTION',
    "owner" TEXT,
    "dueDate" DATETIME,
    "costEstimate" REAL,
    "costPending" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoardIssue_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoardIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BoardIssue_orgId_status_idx" ON "BoardIssue"("orgId", "status");
