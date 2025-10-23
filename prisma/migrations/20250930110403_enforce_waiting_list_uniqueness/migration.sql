/*
  Warnings:

  - A unique constraint covering the columns `[conferenceId,userId]` on the table `WaitingListEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WaitingListEntry_conferenceId_userId_key" ON "public"."WaitingListEntry"("conferenceId", "userId");
