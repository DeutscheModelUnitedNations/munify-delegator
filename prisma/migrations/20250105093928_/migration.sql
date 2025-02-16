-- AlterTable
ALTER TABLE "_CommitteeToNation" ADD CONSTRAINT "_CommitteeToNation_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CommitteeToNation_AB_unique";

-- AlterTable
ALTER TABLE "_ConferenceSupervisorToDelegation" ADD CONSTRAINT "_ConferenceSupervisorToDelegation_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ConferenceSupervisorToDelegation_AB_unique";

-- AlterTable
ALTER TABLE "_ConferenceSupervisorToDelegationMember" ADD CONSTRAINT "_ConferenceSupervisorToDelegationMember_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ConferenceSupervisorToDelegationMember_AB_unique";

-- AlterTable
ALTER TABLE "_CustomConferenceRoleToSingleParticipant" ADD CONSTRAINT "_CustomConferenceRoleToSingleParticipant_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CustomConferenceRoleToSingleParticipant_AB_unique";
