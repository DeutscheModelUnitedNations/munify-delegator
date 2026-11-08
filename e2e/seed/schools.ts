/**
 * Fixtures for the school deletion spec (e2e/authorization/school-delete.spec.ts).
 *
 * A conference of its own with a participant care member and two waiting list entrants: one
 * names a school only they name, which the spec deletes and every run puts back; the other names
 * a school somebody in the shared prep conference names too, which participant care may not
 * delete.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/api/db/schema';
import { upsertConference } from './conference';
import { upsertTeamMember } from './teamMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { COMPLETE_PROFILE, upsertUsers } from './user';

const E2E_SCHOOL_CONFERENCE_ID = 'e2e00000conference0000012';
export const E2E_SCHOOL_CARE_ID = 'e2e-school-care';
export const E2E_TYPO_SCHOOL_ID = 'e2e00000school0000000002';
export const E2E_SHARED_SCHOOL_ID = 'e2e00000school0000000003';

export async function seedSchools(
	db: NodePgDatabase,
	{ otherConferenceId }: { otherConferenceId: string }
) {
	await upsertConference(db, {
		id: E2E_SCHOOL_CONFERENCE_ID,
		title: 'E2E School Conference',
		state: 'PARTICIPANT_REGISTRATION',
		nations: {}
	});
	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_SCHOOL_CARE_ID,
			givenName: 'School',
			familyName: 'Care'
		},
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: 'e2e-school-typo',
			givenName: 'School',
			familyName: 'Typo'
		},
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: 'e2e-school-shared',
			givenName: 'School',
			familyName: 'Shared'
		},
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: 'e2e-school-elsewhere',
			givenName: 'School',
			familyName: 'Elsewhere'
		}
	]);
	await upsertTeamMember(db, E2E_SCHOOL_CONFERENCE_ID, E2E_SCHOOL_CARE_ID, 'PARTICIPANT_CARE');

	for (const school of [
		{ id: E2E_TYPO_SCHOOL_ID, name: 'E2E asdfgh' },
		{ id: E2E_SHARED_SCHOOL_ID, name: 'E2E Schule Geteilt' }
	]) {
		await db
			.insert(schema.school)
			.values(school)
			.onConflictDoUpdate({ target: schema.school.id, set: school });
	}

	for (const entry of [
		{
			conferenceId: E2E_SCHOOL_CONFERENCE_ID,
			userId: 'e2e-school-typo',
			schoolId: E2E_TYPO_SCHOOL_ID
		},
		{
			conferenceId: E2E_SCHOOL_CONFERENCE_ID,
			userId: 'e2e-school-shared',
			schoolId: E2E_SHARED_SCHOOL_ID
		},
		{
			conferenceId: otherConferenceId,
			userId: 'e2e-school-elsewhere',
			schoolId: E2E_SHARED_SCHOOL_ID
		}
	]) {
		const row = { ...entry, experience: 'e', motivation: 'm', assignedAt: null };
		await db
			.insert(schema.waitingListEntry)
			.values(row)
			.onConflictDoUpdate({
				target: [schema.waitingListEntry.conferenceId, schema.waitingListEntry.userId],
				set: row
			});
	}
}
