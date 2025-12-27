/*
  Warnings:

  - The `assigendDocumentNumber` column on the `ConferenceParticipantStatus` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[conferenceId,assigendDocumentNumber]` on the table `ConferenceParticipantStatus` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ConferenceParticipantStatus" DROP COLUMN "assigendDocumentNumber",
ADD COLUMN     "assigendDocumentNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceParticipantStatus_conferenceId_assigendDocumentNu_key" ON "ConferenceParticipantStatus"("conferenceId", "assigendDocumentNumber");
