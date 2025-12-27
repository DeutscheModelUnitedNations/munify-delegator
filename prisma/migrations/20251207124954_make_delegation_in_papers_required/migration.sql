/*
  Warnings:

  - Made the column `delegationId` on table `Paper` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Paper" ALTER COLUMN "delegationId" SET NOT NULL;
