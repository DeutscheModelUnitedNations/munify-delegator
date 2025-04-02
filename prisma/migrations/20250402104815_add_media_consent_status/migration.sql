-- CreateEnum
CREATE TYPE "MediaConsentStatus" AS ENUM ('NOT_SET', 'ALLOWED_ALL', 'PARTIALLY_ALLOWED', 'NOT_ALLOWED');

-- AlterTable
ALTER TABLE "ConferenceParticipantStatus" ADD COLUMN     "mediaConsentStatus" "MediaConsentStatus" NOT NULL DEFAULT 'NOT_SET';
