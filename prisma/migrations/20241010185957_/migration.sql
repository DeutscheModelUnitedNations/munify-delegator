/*
 Warnings:
 
 - You are about to drop the column `endRegistration` on the `Conference` table. All the data in the column will be lost.
 - You are about to drop the column `status` on the `Conference` table. All the data in the column will be lost.
 - Added the required column `endConference` to the `Conference` table without a default value. This is not possible if the table is not empty.
 - Added the required column `startAssignment` to the `Conference` table without a default value. This is not possible if the table is not empty.
 - Added the required column `startConference` to the `Conference` table without a default value. This is not possible if the table is not empty.
 - Made the column `startRegistration` on table `Conference` required. This step will fail if there are existing NULL values in that column.
 
 */
-- -- AlterTable
-- ALTER TABLE "Conference" DROP COLUMN "endRegistration",
-- DROP COLUMN "status",
-- ADD COLUMN     "endConference" TIMESTAMP(3) NOT NULL,
-- ADD COLUMN     "startAssignment" TIMESTAMP(3) NOT NULL,
-- ADD COLUMN     "startConference" TIMESTAMP(3) NOT NULL,
-- ALTER COLUMN "startRegistration" SET NOT NULL;
-- Add new columns
ALTER TABLE "Conference"
ADD COLUMN "startAssignment" TIMESTAMP(3),
  ADD COLUMN "endConference" TIMESTAMP(3),
  ADD COLUMN "startConference" TIMESTAMP(3);
-- Transfer old values to new column
UPDATE "Conference"
SET "startAssignment" = "endRegistration";
-- Drop old columns
ALTER TABLE "Conference" DROP COLUMN "endRegistration",
  DROP COLUMN "status";
-- Drop unused enum
DROP TYPE "ConferenceStatus";
-- Set default values for date columns if there is no value present
UPDATE "Conference"

-- SET "startAssignment" = '1970-01-01 00:00:00+00',
--   "endConference" = '1970-01-01 00:00:00+00',
--   "startConference" = '1970-01-01 00:00:00+00',
--   "startRegistration" = '1970-01-01 00:00:00+00';