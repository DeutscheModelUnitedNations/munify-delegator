-- DropIndex
DROP INDEX "TeamMemberInvitation_conferenceId_email_key";

-- CreateIndex
CREATE INDEX "TeamMemberInvitation_conferenceId_email_idx" ON "TeamMemberInvitation"("conferenceId", "email");

-- Guard against duplicate pending invites (partial unique index)
CREATE UNIQUE INDEX "TeamMemberInvitation_conferenceId_email_pending_key"
ON "TeamMemberInvitation"("conferenceId", "email")
WHERE "usedAt" IS NULL AND "revokedAt" IS NULL;
