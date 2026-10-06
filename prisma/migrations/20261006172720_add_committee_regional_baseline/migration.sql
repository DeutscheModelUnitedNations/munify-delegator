-- CreateEnum
CREATE TYPE "RegionalBaseline" AS ENUM ('UN_MEMBERS', 'HUMAN_RIGHTS_COUNCIL', 'ECOSOC', 'SECURITY_COUNCIL', 'MANUAL');

-- AlterTable
ALTER TABLE "Committee" ADD COLUMN     "regionalBaseline" "RegionalBaseline" NOT NULL DEFAULT 'UN_MEMBERS',
ADD COLUMN     "regionalBaselineTargets" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
