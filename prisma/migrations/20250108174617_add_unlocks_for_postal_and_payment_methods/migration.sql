-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "unlockPayments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unlockPostals" BOOLEAN NOT NULL DEFAULT false;
