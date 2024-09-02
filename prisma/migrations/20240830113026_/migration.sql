-- CreateEnum
CREATE TYPE "ConferenceStatus" AS ENUM ('PRE', 'ACTIVE', 'POST');

-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "status" "ConferenceStatus" NOT NULL DEFAULT 'PRE';
