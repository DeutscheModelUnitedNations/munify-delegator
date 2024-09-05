/*
  Warnings:

  - You are about to drop the column `icon` on the `CustomConferenceRole` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `NonStateActor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomConferenceRole" DROP COLUMN "icon",
ADD COLUMN     "fontAwesomeIcon" TEXT;

-- AlterTable
ALTER TABLE "NonStateActor" DROP COLUMN "icon",
ADD COLUMN     "fontAwesomeIcon" TEXT;
