/**
 * Fixtures for the document number spec (e2e/authorization/document-numbers.spec.ts).
 *
 * A conference of its own with participant care and people taking part, because the spec hands out
 * its document numbers. Every run takes them away again.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_NUMBERS_CONFERENCE_ID = 'e2e00000conference0000019';
export const E2E_NUMBERS_CARE_ID = 'e2e-numbers-care';
export const E2E_NUMBERS_USER_IDS = [1, 2, 3, 4, 5, 6].map((n) => `e2e-numbers-person-${n}`);

export async function seedDocumentNumbers(db: NodePgDatabase) {
	await upsertConference(db, {
		id: E2E_NUMBERS_CONFERENCE_ID,
		title: 'E2E Document Numbers Conference',
		state: 'PREPARATION',
		nations: {}
	});
	await upsertUsers(
		db,
		[E2E_NUMBERS_CARE_ID, ...E2E_NUMBERS_USER_IDS].map((id) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id
		}))
	);
	await upsertTeamMember(db, E2E_NUMBERS_CONFERENCE_ID, E2E_NUMBERS_CARE_ID, 'PARTICIPANT_CARE');
	for (const userId of E2E_NUMBERS_USER_IDS) {
		await upsertParticipant(db, E2E_NUMBERS_CONFERENCE_ID, userId);
	}
	await db
		.update(schema.conferenceParticipant)
		.set({ assignedDocumentNumber: null })
		.where(eq(schema.conferenceParticipant.conferenceId, E2E_NUMBERS_CONFERENCE_ID));
}
