/*
  Warnings:

  - Added the required column `type` to the `Paper` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "type" "PaperType" NOT NULL;
