/*
  Warnings:

  - You are about to drop the column `imageDataUrl` on the `Conference` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conference" DROP COLUMN "imageDataUrl",
ADD COLUMN     "image" BYTEA,
ADD COLUMN     "imageName" TEXT;
