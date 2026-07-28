-- AlterTable
ALTER TABLE "ComplianceDocument" ADD COLUMN "language" TEXT;
ALTER TABLE "ComplianceDocument" ADD COLUMN "meetingDocType" TEXT;
ALTER TABLE "ComplianceDocument" ADD COLUMN "meetingYear" INTEGER;
ALTER TABLE "ComplianceDocument" ADD COLUMN "minutesFiled" BOOLEAN;
ALTER TABLE "ComplianceDocument" ADD COLUMN "minutesFiledAt" DATETIME;
ALTER TABLE "ComplianceDocument" ADD COLUMN "minutesFilingRequired" BOOLEAN;
