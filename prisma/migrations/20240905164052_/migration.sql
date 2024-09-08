/*
  Warnings:

  - A unique constraint covering the columns `[conferenceId,userId]` on the table `SingleParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SingleParticipant_conferenceId_userId_key" ON "SingleParticipant"("conferenceId", "userId");
