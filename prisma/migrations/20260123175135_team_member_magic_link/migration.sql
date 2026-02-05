-- AlterEnum
ALTER TYPE "TeamRole" ADD VALUE 'TEAM_COORDINATOR';

-- CreateTable
CREATE TABLE "TeamMemberInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "conferenceId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMemberInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberInvitation_token_key" ON "TeamMemberInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamMemberInvitation_token_idx" ON "TeamMemberInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamMemberInvitation_conferenceId_idx" ON "TeamMemberInvitation"("conferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberInvitation_conferenceId_email_key" ON "TeamMemberInvitation"("conferenceId", "email");

-- AddForeignKey
ALTER TABLE "TeamMemberInvitation" ADD CONSTRAINT "TeamMemberInvitation_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberInvitation" ADD CONSTRAINT "TeamMemberInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberInvitation" ADD CONSTRAINT "TeamMemberInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
