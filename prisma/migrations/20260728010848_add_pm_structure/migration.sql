-- CreateTable
CREATE TABLE "PropertyManagementCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalName" TEXT NOT NULL,
    "registrationId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PMStaffMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PMStaffMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PropertyManagementCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PMStaffMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PMAccessGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "membershipId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'VIEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PMAccessGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "PMStaffMembership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PMAccessGrant_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PMContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "terms" TEXT,
    "fileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PMContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PropertyManagementCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PMContract_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PMStaffMembership_companyId_userId_key" ON "PMStaffMembership"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PMAccessGrant_membershipId_orgId_area_key" ON "PMAccessGrant"("membershipId", "orgId", "area");
