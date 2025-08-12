/*
  Warnings:

  - You are about to drop the `_ConferenceSupervisorToDelegation` table. If the table is not empty, all the data it contains will be lost.

*/

INSERT INTO "_ConferenceSupervisorToDelegationMember"("A", "B")
SELECT old."A" AS supervisor_id
     , dm.id   AS delegation_member_id
FROM "_ConferenceSupervisorToDelegation" AS old
JOIN "DelegationMember" AS dm
  ON dm."delegationId" = old."B"
-- avoid duplicate inserts if the script is re-run
ON CONFLICT DO NOTHING


-- DropForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegation" DROP CONSTRAINT "_ConferenceSupervisorToDelegation_A_fkey";

-- DropForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegation" DROP CONSTRAINT "_ConferenceSupervisorToDelegation_B_fkey";

-- AlterTable
ALTER TABLE "ConferenceSupervisor" ADD COLUMN     "connectionCode" TEXT NOT NULL DEFAULT gen_random_uuid();

-- DropTable
DROP TABLE "_ConferenceSupervisorToDelegation";

-- CreateTable
CREATE TABLE "_ConferenceSupervisorToSingleParticipant" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConferenceSupervisorToSingleParticipant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ConferenceSupervisorToSingleParticipant_B_index" ON "_ConferenceSupervisorToSingleParticipant"("B");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceSupervisor_conferenceId_connectionCode_key" ON "ConferenceSupervisor"("conferenceId", "connectionCode");

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToSingleParticipant" ADD CONSTRAINT "_ConferenceSupervisorToSingleParticipant_A_fkey" FOREIGN KEY ("A") REFERENCES "ConferenceSupervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToSingleParticipant" ADD CONSTRAINT "_ConferenceSupervisorToSingleParticipant_B_fkey" FOREIGN KEY ("B") REFERENCES "SingleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;