/*
  Warnings:

  - You are about to drop the column `postalRegistration` on the `ConferenceParticipantStatus` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conference" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bic" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'EUR',
ADD COLUMN     "feeAmount" DOUBLE PRECISION,
ADD COLUMN     "guardianConsentContent" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "mediaConsentContent" TEXT,
ADD COLUMN     "postalApartment" TEXT,
ADD COLUMN     "postalCity" TEXT,
ADD COLUMN     "postalCountry" TEXT,
ADD COLUMN     "postalName" TEXT,
ADD COLUMN     "postalStreet" TEXT,
ADD COLUMN     "postalZip" TEXT,
ADD COLUMN     "termsAndConditionsContent" TEXT;

-- AlterTable
ALTER TABLE "ConferenceParticipantStatus" DROP COLUMN "postalRegistration",
ADD COLUMN     "guardianConsent" "AdministrativeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "mediaConsent" "AdministrativeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "termsAndConditions" "AdministrativeStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recievedAt" TIMESTAMP(3),
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
