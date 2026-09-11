-- CreateTable
CREATE TABLE "AgmDocumentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agmId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT 'A',
    "source" TEXT NOT NULL,
    "generatedKey" TEXT,
    "documentId" TEXT,
    "includeInDetailed" BOOLEAN NOT NULL DEFAULT true,
    "includeInSummary" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgmDocumentItem_agmId_fkey" FOREIGN KEY ("agmId") REFERENCES "Agm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgmDocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgmDocumentItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgmDocumentItem_agmId_number_key" ON "AgmDocumentItem"("agmId", "number");
