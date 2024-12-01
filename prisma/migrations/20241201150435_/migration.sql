/*
  Warnings:

  - You are about to drop the `AssignedConferenceRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AssignedConferenceRole" DROP CONSTRAINT "AssignedConferenceRole_customConferenceRoleId_fkey";

-- DropForeignKey
ALTER TABLE "AssignedConferenceRole" DROP CONSTRAINT "AssignedConferenceRole_singleParticipantId_fkey";

-- AlterTable
ALTER TABLE "SingleParticipant" ADD COLUMN     "assignedRoleId" TEXT,
ADD COLUMN     "assignmentDetails" TEXT;

-- DropTable
DROP TABLE "AssignedConferenceRole";

-- AddForeignKey
ALTER TABLE "SingleParticipant" ADD CONSTRAINT "SingleParticipant_assignedRoleId_fkey" FOREIGN KEY ("assignedRoleId") REFERENCES "CustomConferenceRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
