-- CreateTable
CREATE TABLE "public"."WaitingListEntry" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "requests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitingListEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "public"."Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
