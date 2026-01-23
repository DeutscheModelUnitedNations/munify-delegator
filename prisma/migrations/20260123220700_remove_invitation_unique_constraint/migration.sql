-- DropIndex
DROP INDEX "TeamMemberInvitation_conferenceId_email_key";

-- CreateIndex
CREATE INDEX "TeamMemberInvitation_conferenceId_email_idx" ON "TeamMemberInvitation"("conferenceId", "email");
