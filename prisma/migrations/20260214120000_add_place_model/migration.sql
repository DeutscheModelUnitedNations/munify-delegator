-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "directions" TEXT,
    "info" TEXT,
    "websiteUrl" TEXT,
    "sitePlanDataURL" TEXT,
    "conferenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_conferenceId_name_key" ON "Place"("conferenceId", "name");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Replace place string with placeId relation
ALTER TABLE "CalendarEntry" ADD COLUMN "placeId" TEXT;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropColumn (place string is replaced by placeId relation)
ALTER TABLE "CalendarEntry" DROP COLUMN "place";
