-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "agendaItemId" TEXT;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "CommitteeAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
