/*
  Warnings:

  - A unique constraint covering the columns `[entryCode]` on the table `Delegation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conferenceId,userId]` on the table `DelegationMember` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conferenceId` to the `DelegationMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DelegationMember" ADD COLUMN     "conferenceId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_entryCode_key" ON "Delegation"("entryCode");

-- CreateIndex
CREATE UNIQUE INDEX "DelegationMember_conferenceId_userId_key" ON "DelegationMember"("conferenceId", "userId");

-- AddForeignKey
ALTER TABLE "DelegationMember" ADD CONSTRAINT "DelegationMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
