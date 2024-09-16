/*
  Warnings:

  - A unique constraint covering the columns `[userId,conferenceId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.
  - Made the column `delegationId` on table `RoleApplication` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "RoleApplication" DROP CONSTRAINT "RoleApplication_delegationId_fkey";

-- AlterTable
ALTER TABLE "ConferenceParticipantStatus" ALTER COLUMN "postalRegistration" SET DEFAULT 'PENDING',
ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING',
ALTER COLUMN "didAttend" SET DEFAULT false;

-- AlterTable
ALTER TABLE "RoleApplication" ALTER COLUMN "delegationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_conferenceId_key" ON "TeamMember"("userId", "conferenceId");

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "Delegation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
