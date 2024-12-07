-- DropForeignKey
ALTER TABLE "AssignedConferenceRole" DROP CONSTRAINT "AssignedConferenceRole_customConferenceRoleId_fkey";

-- DropForeignKey
ALTER TABLE "AssignedConferenceRole" DROP CONSTRAINT "AssignedConferenceRole_singleParticipantId_fkey";

-- AddForeignKey
ALTER TABLE "AssignedConferenceRole" ADD CONSTRAINT "AssignedConferenceRole_customConferenceRoleId_fkey" FOREIGN KEY ("customConferenceRoleId") REFERENCES "CustomConferenceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedConferenceRole" ADD CONSTRAINT "AssignedConferenceRole_singleParticipantId_fkey" FOREIGN KEY ("singleParticipantId") REFERENCES "SingleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
