/*
  Warnings:

  - You are about to drop the column `conferenceId` on the `Paper` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Paper` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Paper" DROP CONSTRAINT "Paper_conferenceId_fkey";

-- AlterTable
ALTER TABLE "Paper" DROP COLUMN "conferenceId",
DROP COLUMN "content";

-- CreateTable
CREATE TABLE "PaperVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "paperId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperReview" (
    "id" TEXT NOT NULL,
    "comments" JSONB NOT NULL,
    "paperId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaperVersion_paperId_version_key" ON "PaperVersion"("paperId", "version");

-- AddForeignKey
ALTER TABLE "PaperVersion" ADD CONSTRAINT "PaperVersion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperReview" ADD CONSTRAINT "PaperReview_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperReview" ADD CONSTRAINT "PaperReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
