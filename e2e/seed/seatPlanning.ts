/**
 * Fixtures for the seat planning specs (e2e/management/seat-planning.spec.ts).
 *
 * A separate conference, because the specs add and remove seats, committees and non-state actors.
 * Every run resets it to the state below: GV holds Germany, France and the Netherlands, SR only the
 * Netherlands. The Netherlands' delegation has a member assigned to GV, which locks that seat, and
 * one NSA has a delegation assigned, which blocks deleting it.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, ne, notInArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedConference } from '../../src/api/db/seed-data/conference';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertTeamMember } from './teamMember';

export const E2E_SEAT_CONFERENCE_ID = 'e2e00000conference0000003';
export const E2E_SEAT_GV_ID = 'e2e00000seatcommittee00001';
export const E2E_SEAT_SR_ID = 'e2e00000seatcommittee00002';
export const E2E_SEAT_ASSIGNED_NSA_ID = 'e2e00000seatnsa0000000001';
export const E2E_SEAT_ASSIGNED_NSA_NAME = 'E2E Assigned NSA';
export const E2E_SEAT_PM_ID = 'e2e-seat-pm';
export const E2E_SEAT_CONTENT_LEAD_ID = 'e2e-seat-content-lead';
export const E2E_SEAT_PARTICIPANT_CARE_ID = 'e2e-seat-pc';
export const E2E_SEAT_DELEGATE_ID = 'e2e-seat-delegate';
export const E2E_SEAT_DELEGATE_FAMILY_NAME = 'E2ESeatDelegate';

const NATIONS = { deu: 'de', fra: 'fr', nld: 'nl', ita: 'it' };
const LOCKED_DELEGATION_ID = 'e2e00000seatdelegation0001';
const NSA_DELEGATION_ID = 'e2e00000seatdelegation0002';

export async function seedSeatPlanning(db: NodePgDatabase) {
	const conference = {
		...makeSeedConference({ state: 'PRE' }),
		id: E2E_SEAT_CONFERENCE_ID,
		title: 'E2E Seat Planning Conference'
	};
	await db
		.insert(schema.conference)
		.values(conference)
		.onConflictDoUpdate({ target: schema.conference.id, set: conference });

	for (const [alpha3Code, alpha2Code] of Object.entries(NATIONS)) {
		await db.insert(schema.nation).values({ alpha3Code, alpha2Code }).onConflictDoNothing();
	}

	// committees and NSAs a previous run created
	await db
		.delete(schema.committee)
		.where(
			and(
				eq(schema.committee.conferenceId, conference.id),
				notInArray(schema.committee.id, [E2E_SEAT_GV_ID, E2E_SEAT_SR_ID])
			)
		);
	await db
		.delete(schema.nonStateActor)
		.where(
			and(
				eq(schema.nonStateActor.conferenceId, conference.id),
				ne(schema.nonStateActor.id, E2E_SEAT_ASSIGNED_NSA_ID)
			)
		);

	const committees = [
		{
			id: E2E_SEAT_GV_ID,
			name: 'Generalversammlung',
			abbreviation: 'SPGV',
			nations: ['deu', 'fra', 'nld']
		},
		{ id: E2E_SEAT_SR_ID, name: 'Sicherheitsrat', abbreviation: 'SPSR', nations: ['nld'] }
	];
	for (const [index, { id, name, abbreviation, nations }] of committees.entries()) {
		const committee = {
			id,
			conferenceId: conference.id,
			name,
			abbreviation,
			numOfSeatsPerDelegation: 1,
			regionalBaseline: 'UN_MEMBERS' as const,
			regionalBaselineTargets: [],
			// fixed order of the matrix columns
			createdAt: new Date(2026, 0, 1 + index)
		};
		await db
			.insert(schema.committee)
			.values(committee)
			.onConflictDoUpdate({ target: schema.committee.id, set: committee });

		await db.delete(schema.committeeToNation).where(eq(schema.committeeToNation.a, id));
		await db
			.insert(schema.committeeToNation)
			.values(nations.map((alpha3Code) => ({ a: id, b: alpha3Code })));
	}

	const nsa = {
		id: E2E_SEAT_ASSIGNED_NSA_ID,
		conferenceId: conference.id,
		name: E2E_SEAT_ASSIGNED_NSA_NAME,
		abbreviation: 'E2EN',
		description: 'Has a delegation assigned',
		fontAwesomeIcon: 'fa-dove',
		seatAmount: 2
	};
	await db
		.insert(schema.nonStateActor)
		.values(nsa)
		.onConflictDoUpdate({ target: schema.nonStateActor.id, set: nsa });

	const users = [
		...[E2E_SEAT_PM_ID, E2E_SEAT_CONTENT_LEAD_ID, E2E_SEAT_PARTICIPANT_CARE_ID].map((id) => ({
			...makeSeedUser(),
			id,
			email: `${id}@e2e.test`,
			// the my-account form schema has to be satisfied, or every login lands on /my-account
			// (see upsertActorUser in seed.ts)
			country: 'DEU',
			phone: '+4917612345678',
			emergencyContacts: 'Emergency contact: +49 176 12345678'
		})),
		{
			...makeSeedUser(),
			id: E2E_SEAT_DELEGATE_ID,
			email: `${E2E_SEAT_DELEGATE_ID}@e2e.test`,
			givenName: 'Seat',
			familyName: E2E_SEAT_DELEGATE_FAMILY_NAME
		}
	];
	for (const user of users) {
		await db
			.insert(schema.user)
			.values(user)
			.onConflictDoUpdate({ target: schema.user.id, set: user });
	}

	const teamMembers = [
		[E2E_SEAT_PM_ID, 'PROJECT_MANAGEMENT'],
		[E2E_SEAT_CONTENT_LEAD_ID, 'CONTENT_LEAD'],
		[E2E_SEAT_PARTICIPANT_CARE_ID, 'PARTICIPANT_CARE']
	] as const;
	for (const [userId, role] of teamMembers) {
		await upsertTeamMember(db, conference.id, userId, role);
	}

	const lockedDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: LOCKED_DELEGATION_ID,
		assignedNationAlpha3Code: 'nld'
	};
	const nsaDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: NSA_DELEGATION_ID,
		assignedNonStateActorId: E2E_SEAT_ASSIGNED_NSA_ID
	};
	for (const delegation of [lockedDelegation, nsaDelegation]) {
		await db
			.insert(schema.delegation)
			.values(delegation)
			.onConflictDoUpdate({ target: schema.delegation.id, set: delegation });
	}

	const lockedMember = {
		...makeSeedDelegationMember({
			conferenceId: conference.id,
			delegationId: lockedDelegation.id,
			userId: E2E_SEAT_DELEGATE_ID,
			isHeadDelegate: true,
			assignedCommitteeId: E2E_SEAT_GV_ID
		}),
		id: 'e2e00000seatdelegationmember1'
	};
	await db
		.insert(schema.delegationMember)
		.values(lockedMember)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: lockedMember });
}
