-- AlterTable
ALTER TABLE "MessageAudit" ADD COLUMN     "replyToMessageId" TEXT;

-- AddForeignKey
ALTER TABLE "MessageAudit" ADD CONSTRAINT "MessageAudit_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "MessageAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
