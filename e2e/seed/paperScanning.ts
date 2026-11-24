/**
 * Fixtures for the paper scanning spec (e2e/team/paper-scanning.spec.ts).
 *
 * A conference of its own, with participant care and Grace, an adult single participant with a seat, and
 * a second one with the same participant care and Alan, whose pages come in one stack with hers.
 * Every run resets their postal status to nothing in, removes the scanner logins, and resets the
 * conferences to no templates and the default layouts, since the spec scans their pages and uploads
 * templates.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCustomConferenceRole } from '../../src/api/db/seed-data/conferenceRole';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedTeamMember } from '../../src/api/db/seed-data/teamMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_PAPER_CONFERENCE_ID = 'e2e00000conference0000017';
export const E2E_PAPER_SECOND_CONFERENCE_ID = 'e2e00000conference0000018';
export const E2E_PAPER_CARE_ID = 'e2e-paper-care';
export const E2E_PAPER_GRACE_ID = 'e2e-paper-grace';
export const E2E_PAPER_ALAN_ID = 'e2e-paper-alan';

/** Who takes part where, in a seat of the conference's own role. */
const PARTS = [
	{
		userId: E2E_PAPER_GRACE_ID,
		conferenceId: E2E_PAPER_CONFERENCE_ID,
		title: 'E2E Paper Scanning Conference',
		roleId: 'e2e00000paperrole00000001',
		singleParticipantId: 'e2e00000papersingle000001'
	},
	{
		userId: E2E_PAPER_ALAN_ID,
		conferenceId: E2E_PAPER_SECOND_CONFERENCE_ID,
		title: 'E2E Second Paper Conference',
		roleId: 'e2e00000paperrole00000002',
		singleParticipantId: 'e2e00000papersingle000002'
	}
];

export async function seedPaperScanning(db: NodePgDatabase) {
	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_PAPER_CARE_ID,
			givenName: 'E2E',
			familyName: 'PaperCare'
		},
		// adults: their documents have no guardians' consent, their media consent no guardians' part
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_PAPER_GRACE_ID,
			givenName: 'Grace',
			familyName: 'Hopper',
			birthday: new Date('1990-12-09')
		},
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_PAPER_ALAN_ID,
			givenName: 'Alan',
			familyName: 'Turing',
			birthday: new Date('1991-06-23')
		}
	]);
	await db.delete(schema.scannerAccess).where(eq(schema.scannerAccess.userId, E2E_PAPER_CARE_ID));
	for (const part of PARTS) await seedPart({ db, part });
}

/** A conference with participant care and one person in it, nothing of whose paper is in yet. */
async function seedPart({
	db,
	part: { userId, conferenceId, title, roleId, singleParticipantId }
}: {
	db: NodePgDatabase;
	part: (typeof PARTS)[number];
}) {
	await upsertConference(db, { id: conferenceId, title, state: 'PREPARATION', nations: {} });
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
	// a team row of its own in each conference: `upsertTeamMember` keys it by the user alone, which would
	// move one row between them (and a team row's conference never changes)
	const care = {
		...makeSeedTeamMember({ conferenceId, userId: E2E_PAPER_CARE_ID, role: 'PARTICIPANT_CARE' }),
		id: `e2e-team-${conferenceId.slice(-2)}-${E2E_PAPER_CARE_ID}`
	};
	await db
		.insert(schema.teamMember)
		.values(care)
		.onConflictDoUpdate({
			target: [schema.teamMember.conferenceId, schema.teamMember.userId],
			set: { role: care.role }
		});

	const role = {
		...makeSeedCustomConferenceRole({ conferenceId }),
		id: roleId,
		name: 'E2E Paper Role'
	};
	await db
		.insert(schema.conferenceRole)
		.values(role)
		.onConflictDoUpdate({ target: schema.conferenceRole.id, set: role });

	const participantId = await upsertParticipant(db, conferenceId, userId);
	const single = {
		...makeSeedSingleParticipant({ conferenceParticipantId: participantId, applied: true }),
		id: singleParticipantId,
		assignedRoleId: role.id
	};
	await db
		.insert(schema.singleParticipant)
		.values(single)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: single });

	await db
		.update(schema.conferenceParticipant)
		.set({
			termsAndConditions: 'PENDING',
			guardianConsent: 'PENDING',
			mediaConsent: 'PENDING',
			mediaConsentStatus: 'NOT_SET'
		})
		.where(eq(schema.conferenceParticipant.id, participantId));
	await db
		.delete(schema.postalScan)
		.where(eq(schema.postalScan.conferenceParticipantId, participantId));
	await db
		.delete(schema.agreementDetail)
		.where(eq(schema.agreementDetail.conferenceParticipantId, participantId));
}
