ALTER TABLE "Conference"
ADD COLUMN "imageDataURL" TEXT;

UPDATE "Conference"
SET
  "imageDataURL" = "imageDataUrl";

ALTER TABLE "Conference"
DROP COLUMN "imageDataUrl";