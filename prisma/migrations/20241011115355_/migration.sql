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

-- AddForeignKey
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceParticipantStatus" ADD CONSTRAINT "ConferenceParticipantStatus_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation"("alpha3Code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_nonStateActorId_fkey" FOREIGN KEY ("nonStateActorId") REFERENCES "NonStateActor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSupervisor" ADD CONSTRAINT "ConferenceSupervisor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
