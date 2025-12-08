/*
  Warnings:

  - You are about to drop the column `paperId` on the `PaperReview` table. All the data in the column will be lost.
  - Added the required column `paperVersionId` to the `PaperReview` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PaperReview" DROP CONSTRAINT "PaperReview_paperId_fkey";

-- AlterTable
ALTER TABLE "PaperReview" DROP COLUMN "paperId",
ADD COLUMN     "paperVersionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "PaperReview" ADD CONSTRAINT "PaperReview_paperVersionId_fkey" FOREIGN KEY ("paperVersionId") REFERENCES "PaperVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
