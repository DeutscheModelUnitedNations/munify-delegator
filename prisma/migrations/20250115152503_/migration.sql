-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "new_gender" "Gender";

UPDATE "User"
SET "new_gender" = CASE
  WHEN "gender" = 'm' THEN 'MALE'::"Gender"
  WHEN "gender" = 'f' THEN 'FEMALE'::"Gender"
  WHEN "gender" = 'd' THEN 'DIVERSE'::"Gender"
  WHEN "gender" = 'n' THEN 'NO_STATEMENT'::"Gender"
  ELSE 'NO_STATEMENT'::"Gender"
END;

ALTER TABLE "User" DROP COLUMN "gender";
ALTER TABLE "User" RENAME COLUMN "new_gender" TO "gender";