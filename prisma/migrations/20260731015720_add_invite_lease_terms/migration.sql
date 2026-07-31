-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "leaseEndDate" DATETIME;
ALTER TABLE "Invite" ADD COLUMN "leaseStartDate" DATETIME;
ALTER TABLE "Invite" ADD COLUMN "monthlyRent" REAL;
