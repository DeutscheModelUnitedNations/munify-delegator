/**
 * Fixtures for the sending pace spec (e2e/team/email-pace.spec.ts).
 *
 * A separate conference, because the spec changes its pace. Every run resets it to no limit.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_EMAIL_PACE_CONFERENCE_ID = 'e2e00000conference0000007';
export const E2E_EMAIL_PACE_CARE_ID = 'e2e-email-pace-care';

export async function seedEmailPace(db: NodePgDatabase) {
	const { id: conferenceId } = await upsertConference(db, {
		id: E2E_EMAIL_PACE_CONFERENCE_ID,
		title: 'E2E Email Pace Conference',
		state: 'PREPARATION',
		nations: {}
	});
	await db
		.update(schema.conference)
		.set({ emailsPerSecond: null })
		.where(eq(schema.conference.id, conferenceId));

	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_EMAIL_PACE_CARE_ID,
			givenName: 'E2E',
			familyName: 'EmailPaceCare'
		}
	]);
	await upsertTeamMember(db, conferenceId, E2E_EMAIL_PACE_CARE_ID, 'PARTICIPANT_CARE');
}
