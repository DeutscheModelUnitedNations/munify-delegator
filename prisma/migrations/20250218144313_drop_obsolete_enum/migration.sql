/*
  Warnings:

  - You are about to drop the column `forGroups` on the `SurveyQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SurveyQuestion" DROP COLUMN "forGroups";

-- DropEnum
DROP TYPE "ParticipantCategory";
