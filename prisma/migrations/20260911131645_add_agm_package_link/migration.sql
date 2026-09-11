-- CreateTable
CREATE TABLE "AgmPackageLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agmId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "openedAt" DATETIME,
    CONSTRAINT "AgmPackageLink_agmId_fkey" FOREIGN KEY ("agmId") REFERENCES "Agm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgmPackageLink_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgmPackageLink_token_key" ON "AgmPackageLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AgmPackageLink_agmId_unitId_key" ON "AgmPackageLink"("agmId", "unitId");
