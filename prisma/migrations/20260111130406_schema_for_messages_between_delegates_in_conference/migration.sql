-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'FAILED', 'BLOCKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canReceiveDelegationMail" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MessageAudit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "messageId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',

    CONSTRAINT "MessageAudit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MessageAudit" ADD CONSTRAINT "MessageAudit_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAudit" ADD CONSTRAINT "MessageAudit_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAudit" ADD CONSTRAINT "MessageAudit_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
