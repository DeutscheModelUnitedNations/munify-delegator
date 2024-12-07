ALTER TABLE "Conference"
ADD COLUMN "startAssignment" TIMESTAMP(3),
  ADD COLUMN "endConference" TIMESTAMP(3),
  ADD COLUMN "startConference" TIMESTAMP(3);
-- Transfer old values to new column
UPDATE "Conference"
SET "startAssignment" = "endRegistration";
-- Drop old columns
ALTER TABLE "Conference" DROP COLUMN "endRegistration",
  DROP COLUMN "status";
-- Drop unused enum
DROP TYPE "ConferenceStatus";
-- Set default values for date columns if there is no value present
UPDATE "Conference"
SET "startRegistration" = COALESCE("startRegistration", CURRENT_DATE);
UPDATE "Conference"
SET "startAssignment" = COALESCE(
    "startAssignment",
    CURRENT_DATE + INTERVAL '3 weeks'
  );
UPDATE "Conference"
SET "startConference" = COALESCE(
    "startConference",
    CURRENT_DATE + INTERVAL '15 weeks'
  );
UPDATE "Conference"
SET "endConference" = COALESCE(
    "endConference",
    CURRENT_DATE + INTERVAL '16 weeks'
  );
-- Set NOT NULL for date columns
ALTER TABLE "Conference"
ALTER COLUMN "startRegistration"
SET NOT NULL;
ALTER TABLE "Conference"
ALTER COLUMN "startAssignment"
SET NOT NULL;
ALTER TABLE "Conference"
ALTER COLUMN "startConference"
SET NOT NULL;
ALTER TABLE "Conference"
ALTER COLUMN "endConference"
SET NOT NULL;