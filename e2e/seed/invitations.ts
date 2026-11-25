/**
 * Fixtures for the expired invitation spec (e2e/team/expired-invitation.spec.ts).
 *
 * A separate conference, because the spec renews its invitations. Every run resets it to two that
 * expired yesterday: one sent again from its row, one replaced by inviting the address anew.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_INVITATIONS_CONFERENCE_ID = 'e2e00000conference0000020';
export const E2E_INVITATIONS_PM_ID = 'e2e-invitations-pm';
export const E2E_EXPIRED_INVITATION_EMAIL = 'e2e-expired-invitee@e2e.test';
export const E2E_REPLACED_INVITATION_EMAIL = 'e2e-replaced-invitee@e2e.test';

export async function seedInvitations(db: NodePgDatabase) {
	const { id: conferenceId } = await upsertConference(db, {
		id: E2E_INVITATIONS_CONFERENCE_ID,
		title: 'E2E Invitations Conference',
		state: 'PREPARATION',
		nations: {}
	});

	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_INVITATIONS_PM_ID,
			givenName: 'E2E',
			familyName: 'InvitationsPm'
		}
	]);
	await upsertTeamMember(db, conferenceId, E2E_INVITATIONS_PM_ID, 'PROJECT_MANAGEMENT');

	// Also those earlier runs created in place of the expired ones
	await db
		.delete(schema.teamMemberInvitation)
		.where(eq(schema.teamMemberInvitation.conferenceId, conferenceId));
	await db.insert(schema.teamMemberInvitation).values(
		[E2E_EXPIRED_INVITATION_EMAIL, E2E_REPLACED_INVITATION_EMAIL].map((email) => ({
			email,
			role: 'REVIEWER' as const,
			token: `token hash of ${email}`,
			expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
			conferenceId,
			invitedById: E2E_INVITATIONS_PM_ID
		}))
	);
}
