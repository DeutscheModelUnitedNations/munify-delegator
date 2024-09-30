/*
  Warnings:

  - A unique constraint covering the columns `[conferenceId,abbreviation]` on the table `NonStateActor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conferenceId,name]` on the table `NonStateActor` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Committee" DROP CONSTRAINT "Committee_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "CustomConferenceRole" DROP CONSTRAINT "CustomConferenceRole_conferenceId_fkey";

-- DropForeignKey
ALTER TABLE "NonStateActor" DROP CONSTRAINT "NonStateActor_conferenceId_fkey";

-- DropIndex
DROP INDEX "NonStateActor_abbreviation_key";

-- DropIndex
DROP INDEX "NonStateActor_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "NonStateActor_conferenceId_abbreviation_key" ON "NonStateActor"("conferenceId", "abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "NonStateActor_conferenceId_name_key" ON "NonStateActor"("conferenceId", "name");

-- AddForeignKey
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonStateActor" ADD CONSTRAINT "NonStateActor_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomConferenceRole" ADD CONSTRAINT "CustomConferenceRole_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
