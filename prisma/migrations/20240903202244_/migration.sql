/*
  Warnings:

  - You are about to drop the column `committeeId` on the `Nation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Nation" DROP CONSTRAINT "Nation_committeeId_fkey";

-- AlterTable
ALTER TABLE "Nation" DROP COLUMN "committeeId";

-- AlterTable
ALTER TABLE "NonStateActor" ALTER COLUMN "seatAmount" SET DEFAULT 2;

-- CreateTable
CREATE TABLE "_CommitteeToNation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CommitteeToNation_AB_unique" ON "_CommitteeToNation"("A", "B");

-- CreateIndex
CREATE INDEX "_CommitteeToNation_B_index" ON "_CommitteeToNation"("B");

-- AddForeignKey
ALTER TABLE "_CommitteeToNation" ADD CONSTRAINT "_CommitteeToNation_A_fkey" FOREIGN KEY ("A") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommitteeToNation" ADD CONSTRAINT "_CommitteeToNation_B_fkey" FOREIGN KEY ("B") REFERENCES "Nation"("alpha3Code") ON DELETE CASCADE ON UPDATE CASCADE;
