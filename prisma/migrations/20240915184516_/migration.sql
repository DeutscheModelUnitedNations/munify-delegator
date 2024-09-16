/*
  Warnings:

  - A unique constraint covering the columns `[conferenceId,userId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeamMember_userId_conferenceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_conferenceId_userId_key" ON "TeamMember"("conferenceId", "userId");
