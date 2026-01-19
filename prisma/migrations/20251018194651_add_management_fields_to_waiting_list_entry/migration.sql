-- AlterTable
ALTER TABLE "public"."WaitingListEntry" ADD COLUMN     "assigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
