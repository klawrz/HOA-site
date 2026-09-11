-- CreateTable
CREATE TABLE "Agm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT,
    "callTimes" TEXT,
    "chairpersonName" TEXT,
    "noticeIssuedOn" DATETIME,
    "proxyDeadline" DATETIME,
    "rsvpDeadline" DATETIME,
    "minutesFiledOn" DATETIME,
    "zoomInfo" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agm_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Agm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgmTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agmId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "callBodyEs" TEXT,
    "callBodyEn" TEXT,
    "firstCallQuorumPct" REAL NOT NULL DEFAULT 50,
    "minutes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgmTrack_agmId_fkey" FOREIGN KEY ("agmId") REFERENCES "Agm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgmAgendaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "numeral" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'ITEM',
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "detailEs" TEXT,
    "detailEn" TEXT,
    "isExtraordinary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgmAgendaItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "AgmTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgmParticipation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agmId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NO_RESPONSE',
    "eligibleToVote" BOOLEAN,
    "eligibilityNote" TEXT,
    "proxyHolderType" TEXT,
    "proxyHolderName" TEXT,
    "proxyHolderRelation" TEXT,
    "proxyRegimeDocUrl" TEXT,
    "proxyCivilDocUrl" TEXT,
    "proxyIdDocUrl" TEXT,
    "proxyVerifiedOn" DATETIME,
    "proxyVerifiedById" TEXT,
    "respondedById" TEXT,
    "respondedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgmParticipation_agmId_fkey" FOREIGN KEY ("agmId") REFERENCES "Agm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgmParticipation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgmParticipation_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgmParticipation_proxyVerifiedById_fkey" FOREIGN KEY ("proxyVerifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agm_orgId_year_key" ON "Agm"("orgId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AgmTrack_agmId_kind_key" ON "AgmTrack"("agmId", "kind");

-- CreateIndex
CREATE INDEX "AgmAgendaItem_trackId_order_idx" ON "AgmAgendaItem"("trackId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AgmParticipation_agmId_unitId_key" ON "AgmParticipation"("agmId", "unitId");
