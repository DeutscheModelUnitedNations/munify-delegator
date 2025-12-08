/*
  Warnings:

  - The values [PRESENTATION_PAPER] on the enum `PaperType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaperType_new" AS ENUM ('POSITION_PAPER', 'WORKING_PAPER', 'INTRODUCTION_PAPER');
ALTER TABLE "Paper" ALTER COLUMN "type" TYPE "PaperType_new" USING ("type"::text::"PaperType_new");
ALTER TYPE "PaperType" RENAME TO "PaperType_old";
ALTER TYPE "PaperType_new" RENAME TO "PaperType";
DROP TYPE "public"."PaperType_old";
COMMIT;
