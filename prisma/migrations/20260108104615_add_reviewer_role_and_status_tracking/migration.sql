-- AlterEnum
ALTER TYPE "TeamRole" ADD VALUE 'REVIEWER';

-- AlterTable
ALTER TABLE "PaperReview" ADD COLUMN     "statusAfter" "PaperStatus",
ADD COLUMN     "statusBefore" "PaperStatus";
