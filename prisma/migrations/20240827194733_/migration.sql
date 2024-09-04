/*
  Warnings:

  - You are about to drop the column `conferenceSupervisorId` on the `Delegation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Delegation" DROP CONSTRAINT "Delegation_conferenceSupervisorId_fkey";

-- AlterTable
ALTER TABLE "Delegation" DROP COLUMN "conferenceSupervisorId";

-- CreateTable
CREATE TABLE "_ConferenceSupervisorToDelegation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ConferenceSupervisorToDelegation_AB_unique" ON "_ConferenceSupervisorToDelegation"("A", "B");

-- CreateIndex
CREATE INDEX "_ConferenceSupervisorToDelegation_B_index" ON "_ConferenceSupervisorToDelegation"("B");

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegation" ADD CONSTRAINT "_ConferenceSupervisorToDelegation_A_fkey" FOREIGN KEY ("A") REFERENCES "ConferenceSupervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConferenceSupervisorToDelegation" ADD CONSTRAINT "_ConferenceSupervisorToDelegation_B_fkey" FOREIGN KEY ("B") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
