-- CreateTable
CREATE TABLE "OwnershipTransferRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "newOwnerEmail" TEXT NOT NULL,
    "newOwnerName" TEXT NOT NULL,
    "since" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedById" TEXT NOT NULL,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OwnershipTransferRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OwnershipTransferRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OwnershipTransferRequest_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OwnershipTransferSellerConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OwnershipTransferSellerConfirmation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OwnershipTransferRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OwnershipTransferSellerConfirmation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "unitId" TEXT,
    "sentById" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthlyRent" REAL,
    "leaseStartDate" DATETIME,
    "leaseEndDate" DATETIME,
    "importedOwnerPhone" TEXT,
    "importedEmergencyContactName" TEXT,
    "importedEmergencyContactPhone" TEXT,
    "importedUnitManagerName" TEXT,
    "importedUnitManagerCompany" TEXT,
    "importedUnitManagerEmail" TEXT,
    "importedUnitManagerPhone" TEXT,
    "transferRequestId" TEXT,
    CONSTRAINT "Invite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invite_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invite_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invite_transferRequestId_fkey" FOREIGN KEY ("transferRequestId") REFERENCES "OwnershipTransferRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invite" ("acceptedAt", "createdAt", "email", "expiresAt", "id", "importedEmergencyContactName", "importedEmergencyContactPhone", "importedOwnerPhone", "importedUnitManagerCompany", "importedUnitManagerEmail", "importedUnitManagerName", "importedUnitManagerPhone", "leaseEndDate", "leaseStartDate", "monthlyRent", "orgId", "role", "sentById", "token", "unitId") SELECT "acceptedAt", "createdAt", "email", "expiresAt", "id", "importedEmergencyContactName", "importedEmergencyContactPhone", "importedOwnerPhone", "importedUnitManagerCompany", "importedUnitManagerEmail", "importedUnitManagerName", "importedUnitManagerPhone", "leaseEndDate", "leaseStartDate", "monthlyRent", "orgId", "role", "sentById", "token", "unitId" FROM "Invite";
DROP TABLE "Invite";
ALTER TABLE "new_Invite" RENAME TO "Invite";
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE UNIQUE INDEX "Invite_transferRequestId_key" ON "Invite"("transferRequestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipTransferSellerConfirmation_requestId_ownerId_key" ON "OwnershipTransferSellerConfirmation"("requestId", "ownerId");
