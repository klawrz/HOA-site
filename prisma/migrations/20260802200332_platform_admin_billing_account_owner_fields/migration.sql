-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerAddressLine1" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerAddressLine2" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerCity" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerCountry" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerPostalCode" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accountOwnerState" TEXT;
ALTER TABLE "Organization" ADD COLUMN "altContactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "altContactName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "altContactPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingExpiry" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "pricingPlan" TEXT;
