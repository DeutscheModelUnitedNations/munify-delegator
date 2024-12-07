UPDATE "Conference"
SET "startConference" = "start";
UPDATE "Conference"
SET "endConference" = "end";
ALTER TABLE "Conference" DROP COLUMN "end",
  DROP COLUMN "start";