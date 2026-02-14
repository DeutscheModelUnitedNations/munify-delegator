-- CreateEnum
CREATE TYPE "CalendarEntryColor" AS ENUM ('SESSION', 'WORKSHOP', 'LOGISTICS', 'SOCIAL', 'CEREMONY', 'BREAK', 'HIGHLIGHT', 'INFO');

-- CreateTable
CREATE TABLE "CalendarDay" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarTrack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "calendarDayId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEntry" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fontAwesomeIcon" TEXT,
    "color" "CalendarEntryColor" NOT NULL DEFAULT 'SESSION',
    "place" TEXT,
    "room" TEXT,
    "calendarDayId" TEXT NOT NULL,
    "calendarTrackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDay_conferenceId_sortOrder_key" ON "CalendarDay"("conferenceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarTrack_calendarDayId_sortOrder_key" ON "CalendarTrack"("calendarDayId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CalendarDay" ADD CONSTRAINT "CalendarDay_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarTrack" ADD CONSTRAINT "CalendarTrack_calendarDayId_fkey" FOREIGN KEY ("calendarDayId") REFERENCES "CalendarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_calendarDayId_fkey" FOREIGN KEY ("calendarDayId") REFERENCES "CalendarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_calendarTrackId_fkey" FOREIGN KEY ("calendarTrackId") REFERENCES "CalendarTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
