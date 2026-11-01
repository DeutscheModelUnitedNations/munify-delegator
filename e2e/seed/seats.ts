/**
 * Fixtures for the seats overview specs (e2e/team/seats.spec.ts).
 *
 * A separate conference, because the specs move delegates between seats. Every run resets it to
 * the state below. GV and SR have one seat per delegation, and Germany, France and Italy sit in
 * both:
 * - Germany: Anna Alpha (head delegate, GV) and Bert Beta (SR)
 * - France: Carla Gamma (head delegate, GV) and Dora Delta, who has no committee yet
 * - Italy: no delegation, so both its seats are free
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertParticipant } from './participant';
import { seatNations, upsertNationRole } from './conferenceRole';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';
import { upsertCommittee, upsertConference } from './conference';

export const E2E_SEATS_CONFERENCE_ID = 'e2e00000conference0000005';
export const E2E_SEATS_GV_ID = 'e2e00000seatscommittee0001';
const E2E_SEATS_SR_ID = 'e2e00000seatscommittee0002';
export const E2E_SEATS_PARTICIPANT_CARE_ID = 'e2e-seats-pc';
const GERMANY_DELEGATION_ID = 'e2e00000seatsdelegation001';
const FRANCE_DELEGATION_ID = 'e2e00000seatsdelegation002';
const PARIS_SCHOOL_ID = 'e2e00000seatsschool000001';
export const E2E_SEATS_PARIS_SCHOOL = 'E2E Schule Paris';

/** The seated and unseated delegates, by the initials the seats table shows */
export const E2E_SEATS_DELEGATES = {
	anna: {
		id: 'e2e-seats-anna',
		memberId: 'e2e00000seatsmember00001',
		given: 'Anna',
		family: 'Alpha'
	},
	bert: {
		id: 'e2e-seats-bert',
		memberId: 'e2e00000seatsmember00002',
		given: 'Bert',
		family: 'Beta'
	},
	carla: {
		id: 'e2e-seats-carla',
		memberId: 'e2e00000seatsmember00003',
		given: 'Carla',
		family: 'Gamma'
	},
	dora: {
		id: 'e2e-seats-dora',
		memberId: 'e2e00000seatsmember00004',
		given: 'Dora',
		family: 'Delta'
	}
} as const;

const NATIONS = { deu: 'de', fra: 'fr', ita: 'it' };

export async function seedSeats(db: NodePgDatabase) {
	const { id: conferenceId } = await upsertConference(db, {
		id: E2E_SEATS_CONFERENCE_ID,
		title: 'E2E Seats Conference',
		state: 'PARTICIPANT_REGISTRATION',
		nations: NATIONS
	});

	const committees = [
		{ id: E2E_SEATS_GV_ID, name: 'Generalversammlung', abbreviation: 'STGV' },
		{ id: E2E_SEATS_SR_ID, name: 'Sicherheitsrat', abbreviation: 'STSR' }
	];
	for (const [index, data] of committees.entries()) {
		// fixed order of the table columns
		const committee = await upsertCommittee(db, conferenceId, data, index);
		await seatNations(db, committee, Object.keys(NATIONS));
	}

	await seedSeatsPeople(db, conferenceId);
	await seedSeatsDelegations(db, conferenceId);
}

/** The participant care member and the delegates, with the school the French ones name. */
async function seedSeatsPeople(db: NodePgDatabase, conferenceId: string) {
	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_SEATS_PARTICIPANT_CARE_ID,
			givenName: 'E2E',
			familyName: 'SeatsCare'
		},
		...Object.values(E2E_SEATS_DELEGATES).map((x) => ({
			...makeSeedUser(),
			id: x.id,
			givenName: x.given,
			familyName: x.family
		}))
	]);
	await upsertTeamMember(db, conferenceId, E2E_SEATS_PARTICIPANT_CARE_ID, 'PARTICIPANT_CARE');

	const school = { id: PARIS_SCHOOL_ID, name: E2E_SEATS_PARIS_SCHOOL };
	await db
		.insert(schema.school)
		.values(school)
		.onConflictDoUpdate({ target: schema.school.id, set: school });
}

/** Germany's and France's delegations as described at the top, replacing whatever a run left. */
async function seedSeatsDelegations(db: NodePgDatabase, conferenceId: string) {
	// the specs move delegates and create delegations (e.g. Italy's), so start from scratch; the
	// members go with their delegations
	await db.delete(schema.delegation).where(eq(schema.delegation.conferenceId, conferenceId));

	const delegations = [
		[GERMANY_DELEGATION_ID, 'deu'],
		[FRANCE_DELEGATION_ID, 'fra']
	] as const;
	for (const [id, nation] of delegations) {
		await db.insert(schema.delegation).values({
			...makeSeedDelegation({ conferenceId, applied: true }),
			id,
			assignedRoleId: await upsertNationRole(db, conferenceId, nation)
		});
	}

	const { anna, bert, carla, dora } = E2E_SEATS_DELEGATES;
	const members = [
		[anna, GERMANY_DELEGATION_ID, E2E_SEATS_GV_ID, true],
		[bert, GERMANY_DELEGATION_ID, E2E_SEATS_SR_ID, false],
		[carla, FRANCE_DELEGATION_ID, E2E_SEATS_GV_ID, true],
		[dora, FRANCE_DELEGATION_ID, null, false]
	] as const;
	for (const [delegate, delegationId, assignedCommitteeId, isHeadDelegate] of members) {
		const conferenceParticipantId = await upsertParticipant(db, conferenceId, delegate.id);
		// the French delegates name their school, which the members menu shows
		await db
			.update(schema.conferenceParticipant)
			.set({ schoolId: delegationId === FRANCE_DELEGATION_ID ? PARIS_SCHOOL_ID : null })
			.where(eq(schema.conferenceParticipant.id, conferenceParticipantId));
		await db.insert(schema.delegationMember).values({
			...makeSeedDelegationMember({
				delegationId,
				conferenceParticipantId,
				assignedCommitteeId,
				isHeadDelegate
			}),
			id: delegate.memberId
		});
	}
}
