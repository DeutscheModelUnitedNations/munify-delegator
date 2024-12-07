/*
  Warnings:

  - You are about to drop the column `startRegistration` on the `Conference` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConferenceState" AS ENUM ('PRE', 'PARTICIPANT_REGISTRATION', 'PREPARATION', 'ACTIVE', 'POST');

-- AlterTable
ALTER TABLE "Conference" DROP COLUMN "startRegistration",
ADD COLUMN     "state" "ConferenceState" NOT NULL DEFAULT 'PRE';
