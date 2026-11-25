/**
 * Fixtures for the feature requirements spec (e2e/team/feature-requirements.spec.ts).
 *
 * A separate conference, because the spec switches payments on and takes the IBAN away again.
 * Every run resets it to nothing set up and every feature off.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_FEATURES_CONFERENCE_ID = 'e2e00000conference0000021';
export const E2E_FEATURES_PM_ID = 'e2e-features-pm';

export async function seedFeatureRequirements(db: NodePgDatabase) {
	const { id: conferenceId } = await upsertConference(db, {
		id: E2E_FEATURES_CONFERENCE_ID,
		title: 'E2E Feature Requirements Conference',
		state: 'PARTICIPANT_REGISTRATION',
		nations: {}
	});
	await db
		.update(schema.conference)
		.set({
			unlockPayments: false,
			unlockPostals: false,
			isOpenPaperSubmission: false,
			showCalendar: false,
			messagingEnabled: false,
			guidePublished: false,
			feeAmount: null,
			currency: null,
			bankAccountHolder: null,
			iban: null,
			bic: null,
			bankName: null
		})
		.where(eq(schema.conference.id, conferenceId));

	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_FEATURES_PM_ID,
			givenName: 'E2E',
			familyName: 'FeaturesPM'
		}
	]);
	await upsertTeamMember(db, conferenceId, E2E_FEATURES_PM_ID, 'PROJECT_MANAGEMENT');
}
