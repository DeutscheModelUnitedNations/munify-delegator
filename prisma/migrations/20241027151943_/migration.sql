/*
  Warnings:

  - You are about to drop the column `image` on the `Conference` table. All the data in the column will be lost.
  - You are about to drop the column `imageName` on the `Conference` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conference" DROP COLUMN "image",
DROP COLUMN "imageName",
ADD COLUMN     "imageDataURL" TEXT;
