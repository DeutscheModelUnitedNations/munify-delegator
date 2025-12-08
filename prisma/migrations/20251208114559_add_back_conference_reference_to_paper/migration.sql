/*
  Warnings:

  - Added the required column `conferenceId` to the `Paper` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "conferenceId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
