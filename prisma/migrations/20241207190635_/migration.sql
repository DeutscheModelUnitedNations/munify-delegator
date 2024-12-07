/*
  Warnings:

  - You are about to drop the column `end` on the `Conference` table. All the data in the column will be lost.
  - You are about to drop the column `imageDataUrl` on the `Conference` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `Conference` table. All the data in the column will be lost.
  - You are about to drop the column `startRegistration` on the `Conference` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConferenceState" AS ENUM ('PRE', 'PARTICIPANT_REGISTRATION', 'PREPARATION', 'ACTIVE', 'POST');

-- DropForeignKey
ALTER TABLE "ConferenceParticipantStatus" DROP CONSTRAINT "ConferenceParticipantStatus_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "ConferenceParticipantStatus" DROP CONSTRAINT "ConferenceParticipantStatus_userId_fkey";

-- DropForeignKey
ALTER TABLE "ConferenceSupervisor" DROP CONSTRAINT "ConferenceSupervisor_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "ConferenceSupervisor" DROP CONSTRAINT "ConferenceSupervisor_userId_fkey";

-- DropForeignKey
ALTER TABLE "Delegation" DROP CONSTRAINT "Delegation_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "DelegationMember" DROP CONSTRAINT "DelegationMember_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "DelegationMember" DROP CONSTRAINT "DelegationMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "RoleApplication" DROP CONSTRAINT "RoleApplication_nationId_fkey";

-- DropForeignKey
ALTER TABLE "RoleApplication" DROP CONSTRAINT "RoleApplication_nonStateActorId_fkey";

-- DropForeignKey
ALTER TABLE "SingleParticipant" DROP CONSTRAINT "SingleParticipant_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "SingleParticipant" DROP CONSTRAINT "SingleParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- AlterTable
ALTER TABLE "Conference" RENAME COLUMN "end" TO "endConference",
RENAME COLUMN "start" TO "startConference",
RENAME COLUMN "imageDataUrl" TO "imageDataURL",
DROP COLUMN "startRegistration",
ADD COLUMN     "info" TEXT,
ADD COLUMN     "state" "ConferenceState" NOT NULL DEFAULT 'PRE';

-- AlterTable
ALTER TABLE "Delegation" ADD COLUMN     "assignedNationAlpha3Code" TEXT,
ADD COLUMN     "assignedNonStateActorId" TEXT;

-- AlterTable
ALTER TABLE "SingleParticipant" ADD COLUMN     "assignedRoleId" TEXT,
ADD COLUMN     "assignmentDetails" TEXT,
ALTER COLUMN "school" DROP NOT NULL,
ALTER COLUMN "motivation" DROP NOT NULL,
ALTER COLUMN "experience" DROP NOT NULL;

-- CreateTable
CREATE TABLE "_ConferenceSupervisorToDelegationMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ConferenceSupervisorToDelegationMember_AB_unique" ON "_ConferenceSupervisorToDelegationMember"("A", "B");

-- CreateIndex
CREATE INDEX "_ConferenceSupervisorToDelegationMember_B_index" ON "_ConferenceSupervisorToDelegationMember"("B");

-- AddForeignKey
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_assignedRoleId_fkey" FOREIGN KEY ("assignedRoleId") REFERENCES "CustomConferenceRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_assignedNationAlpha3Code_fkey" FOREIGN KEY ("assignedNationAlpha3Code") REFERENCES "Nation"("alpha3Code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_assignedNonStateActorId_fkey" FOREIGN KEY ("assignedNonStateActorId") REFERENCES "NonStateActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation"("alpha3Code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nonStateActorId_fkey" FOREIGN KEY ("nonStateActorId") REFERENCES "NonStateActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegationMember" ADD CONSTRAINT "_ConferenceSupervisorToDelegationMember_A_fkey" FOREIGN KEY ("A") REFERENCES "ConferenceSupervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegationMember" ADD CONSTRAINT "_ConferenceSupervisorToDelegationMember_B_fkey" FOREIGN KEY ("B") REFERENCES "DelegationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
