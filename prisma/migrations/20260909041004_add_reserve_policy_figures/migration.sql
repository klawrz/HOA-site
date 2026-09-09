-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "reservePolicyAsOf" TEXT;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyBalance" REAL;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyBudgetLineUsd" REAL;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyBudgetYear" INTEGER;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyExchangeRate" REAL;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyFloorPct" INTEGER;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyRevision" TEXT;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyRoofDrawdown" REAL;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyRoofYear" INTEGER;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN "reservePolicyTopUpYears" INTEGER;
