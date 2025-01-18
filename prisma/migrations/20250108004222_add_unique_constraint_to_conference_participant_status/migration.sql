/*
  Warnings:

  - A unique constraint covering the columns `[userId,conferenceId]` on the table `ConferenceParticipantStatus` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ConferenceParticipantStatus_userId_conferenceId_key" ON "ConferenceParticipantStatus"("userId", "conferenceId");
