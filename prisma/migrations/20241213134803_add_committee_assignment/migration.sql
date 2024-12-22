-- AlterTable
ALTER TABLE "DelegationMember" ADD COLUMN     "assignedCommitteeId" TEXT;

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_assignedCommitteeId_fkey" FOREIGN KEY ("assignedCommitteeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
