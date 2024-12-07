-- AlterTable
ALTER TABLE "Delegation" ADD COLUMN     "assignedNationAlpha3Code" TEXT,
ADD COLUMN     "assignedNonStateActorId" TEXT;

-- CreateTable
CREATE TABLE "AssignedConferenceRole" (
    "id" TEXT NOT NULL,
    "customConferenceRoleId" TEXT NOT NULL,
    "singleParticipantId" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "AssignedConferenceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConferenceSupervisorToDelegationMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AssignedConferenceRole_singleParticipantId_key" ON "AssignedConferenceRole"("singleParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "_ConferenceSupervisorToDelegationMember_AB_unique" ON "_ConferenceSupervisorToDelegationMember"("A", "B");

-- CreateIndex
CREATE INDEX "_ConferenceSupervisorToDelegationMember_B_index" ON "_ConferenceSupervisorToDelegationMember"("B");

-- AddForeignKey
ALTER TABLE "AssignedConferenceRole" ADD CONSTRAINT "AssignedConferenceRole_customConferenceRoleId_fkey" FOREIGN KEY ("customConferenceRoleId") REFERENCES "CustomConferenceRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedConferenceRole" ADD CONSTRAINT "AssignedConferenceRole_singleParticipantId_fkey" FOREIGN KEY ("singleParticipantId") REFERENCES "SingleParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_assignedNationAlpha3Code_fkey" FOREIGN KEY ("assignedNationAlpha3Code") REFERENCES "Nation"("alpha3Code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_assignedNonStateActorId_fkey" FOREIGN KEY ("assignedNonStateActorId") REFERENCES "NonStateActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegationMember" ADD CONSTRAINT "_ConferenceSupervisorToDelegationMember_A_fkey" FOREIGN KEY ("A") REFERENCES "ConferenceSupervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegationMember" ADD CONSTRAINT "_ConferenceSupervisorToDelegationMember_B_fkey" FOREIGN KEY ("B") REFERENCES "DelegationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
