/*
  Warnings:

  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FoodPreference" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
ADD COLUMN     "apartment" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "foodPreference" "FoodPreference",
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "pronouns" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "zip" TEXT;
