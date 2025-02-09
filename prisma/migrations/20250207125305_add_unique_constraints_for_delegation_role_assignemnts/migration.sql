/*
  Warnings:

  - A unique constraint covering the columns `[conferenceId,entryCode]` on the table `Delegation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conferenceId,assignedNationAlpha3Code]` on the table `Delegation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conferenceId,assignedNonStateActorId]` on the table `Delegation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Delegation_entryCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_conferenceId_entryCode_key" ON "Delegation"("conferenceId", "entryCode");

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_conferenceId_assignedNationAlpha3Code_key" ON "Delegation"("conferenceId", "assignedNationAlpha3Code");

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_conferenceId_assignedNonStateActorId_key" ON "Delegation"("conferenceId", "assignedNonStateActorId");
