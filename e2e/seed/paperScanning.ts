/**
 * Fixtures for the paper scanning spec (e2e/team/paper-scanning.spec.ts).
 *
 * A conference of its own, with participant care and Grace, an adult single participant
 * with a seat. Every run resets her postal status to nothing in, and the conference to no
 * templates and the default layouts, since the spec scans her pages and uploads templates.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCustomConferenceRole } from '../../src/api/db/seed-data/conferenceRole';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_PAPER_CONFERENCE_ID = 'e2e00000conference0000017';
export const E2E_PAPER_CARE_ID = 'e2e-paper-care';
export const E2E_PAPER_GRACE_ID = 'e2e-paper-grace';
const GRACE_SINGLE_PARTICIPANT_ID = 'e2e00000papersingle000001';
const GRACE_ROLE_ID = 'e2e00000paperrole00000001';

export async function seedPaperScanning(db: NodePgDatabase) {
	const { id: conferenceId } = await upsertConference(db, {
		id: E2E_PAPER_CONFERENCE_ID,
		title: 'E2E Paper Scanning Conference',
		state: 'PREPARATION',
		nations: {}
	});
	await db
		.update(schema.conference)
		.set({
			unlockPostals: true,
			documentLayouts: null,
			contractFileId: null,
			guardianConsentFileId: null,
			mediaConsentFileId: null,
			termsAndConditionsFileId: null
		})
		.where(eq(schema.conference.id, conferenceId));

	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_PAPER_CARE_ID,
			givenName: 'E2E',
			familyName: 'PaperCare'
		},
		// an adult: her documents have no guardians' consent, her media consent no guardians' part
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_PAPER_GRACE_ID,
			givenName: 'Grace',
			familyName: 'Hopper',
			birthday: new Date('1990-12-09')
		}
	]);
	await upsertTeamMember(db, conferenceId, E2E_PAPER_CARE_ID, 'PARTICIPANT_CARE');

	const role = {
		...makeSeedCustomConferenceRole({ conferenceId }),
		id: GRACE_ROLE_ID,
		name: 'E2E Paper Role'
	};
	await db
		.insert(schema.conferenceRole)
		.values(role)
		.onConflictDoUpdate({ target: schema.conferenceRole.id, set: role });

	const participantId = await upsertParticipant(db, conferenceId, E2E_PAPER_GRACE_ID);
	const single = {
		...makeSeedSingleParticipant({ conferenceParticipantId: participantId, applied: true }),
		id: GRACE_SINGLE_PARTICIPANT_ID,
		assignedRoleId: role.id
	};
	await db
		.insert(schema.singleParticipant)
		.values(single)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: single });

	// nothing of her paper in yet
	await db
		.update(schema.conferenceParticipant)
		.set({
			termsAndConditions: 'PENDING',
			guardianConsent: 'PENDING',
			mediaConsent: 'PENDING',
			mediaConsentStatus: 'NOT_SET'
		})
		.where(eq(schema.conferenceParticipant.id, participantId));
}
