/*
  Warnings:

  - You are about to drop the column `committeeId` on the `Paper` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Paper" DROP CONSTRAINT "Paper_committeeId_fkey";

-- AlterTable
ALTER TABLE "Paper" DROP COLUMN "committeeId";
