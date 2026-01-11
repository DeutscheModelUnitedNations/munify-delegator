-- CreateEnum
CREATE TYPE "ReviewHelpStatus" AS ENUM ('UNSPECIFIED', 'HELP_NEEDED', 'NO_HELP_WANTED');

-- AlterTable
ALTER TABLE "CommitteeAgendaItem" ADD COLUMN     "reviewHelpStatus" "ReviewHelpStatus" NOT NULL DEFAULT 'UNSPECIFIED';
