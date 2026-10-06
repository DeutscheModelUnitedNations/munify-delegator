/**
 * Fixtures for the seat planning specs (e2e/management/seat-planning.spec.ts).
 *
 * A separate conference, because the specs add and remove seats, committees and non-state actors.
 * Every run resets it to the state below: GV holds Germany, France and the Netherlands, SR only the
 * Netherlands. The Netherlands' delegation has a member assigned to GV, which locks that seat, and
 * one NSA has a delegation assigned, which blocks deleting it.
 */
import { ConferenceState, type PrismaClient } from '@prisma/client';
import { makeSeedConference } from '../../prisma/seed/dev/conference';
import { makeSeedDelegation } from '../../prisma/seed/dev/delegation';
import { makeSeedDelegationMember } from '../../prisma/seed/dev/delegationMember';
import { makeSeedTeamMember } from '../../prisma/seed/dev/teamMember';
import { makeSeedUser } from '../../prisma/seed/dev/user';

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

export async function seedSeatPlanning(db: PrismaClient) {
	const conference = {
		...makeSeedConference({ state: ConferenceState.PRE }),
		id: E2E_SEAT_CONFERENCE_ID,
		title: 'E2E Seat Planning Conference'
	};
	await db.conference.upsert({
		where: { id: conference.id },
		update: conference,
		create: conference
	});

	for (const [alpha3Code, alpha2Code] of Object.entries(NATIONS)) {
		await db.nation.upsert({
			where: { alpha3Code },
			update: {},
			create: { alpha3Code, alpha2Code }
		});
	}

	// committees and NSAs a previous run created
	await db.committee.deleteMany({
		where: { conferenceId: conference.id, id: { notIn: [E2E_SEAT_GV_ID, E2E_SEAT_SR_ID] } }
	});
	await db.nonStateActor.deleteMany({
		where: { conferenceId: conference.id, id: { not: E2E_SEAT_ASSIGNED_NSA_ID } }
	});

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
		const data = {
			conferenceId: conference.id,
			name,
			abbreviation,
			numOfSeatsPerDelegation: 1,
			regionalBaseline: 'UN_MEMBERS' as const,
			regionalBaselineTargets: [],
			// fixed order of the matrix columns
			createdAt: new Date(2026, 0, 1 + index),
			nations: { set: nations.map((alpha3Code) => ({ alpha3Code })) }
		};
		await db.committee.upsert({
			where: { id },
			update: data,
			create: { ...data, id, nations: { connect: data.nations.set } }
		});
	}

	const nsa = {
		conferenceId: conference.id,
		name: E2E_SEAT_ASSIGNED_NSA_NAME,
		abbreviation: 'E2EN',
		description: 'Has a delegation assigned',
		fontAwesomeIcon: 'fa-dove',
		seatAmount: 2
	};
	await db.nonStateActor.upsert({
		where: { id: E2E_SEAT_ASSIGNED_NSA_ID },
		update: nsa,
		create: { ...nsa, id: E2E_SEAT_ASSIGNED_NSA_ID }
	});

	for (const id of [E2E_SEAT_PM_ID, E2E_SEAT_CONTENT_LEAD_ID, E2E_SEAT_PARTICIPANT_CARE_ID]) {
		const user = { ...makeSeedUser(), id, email: `${id}@e2e.test` };
		await db.user.upsert({ where: { id }, update: user, create: user });
	}
	const delegate = {
		...makeSeedUser(),
		id: E2E_SEAT_DELEGATE_ID,
		email: `${E2E_SEAT_DELEGATE_ID}@e2e.test`,
		given_name: 'Seat',
		family_name: E2E_SEAT_DELEGATE_FAMILY_NAME
	};
	await db.user.upsert({ where: { id: delegate.id }, update: delegate, create: delegate });

	const teamMembers = [
		[E2E_SEAT_PM_ID, 'PROJECT_MANAGEMENT'],
		[E2E_SEAT_CONTENT_LEAD_ID, 'CONTENT_LEAD'],
		[E2E_SEAT_PARTICIPANT_CARE_ID, 'PARTICIPANT_CARE']
	] as const;
	for (const [userId, role] of teamMembers) {
		const teamMember = {
			...makeSeedTeamMember({ conferenceId: conference.id, userId, role }),
			id: `e2e-team-${userId}`
		};
		await db.teamMember.upsert({
			where: { id: teamMember.id },
			update: teamMember,
			create: teamMember
		});
	}

	const lockedDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: LOCKED_DELEGATION_ID,
		assignedNationAlpha3Code: 'nld'
	};
	await db.delegation.upsert({
		where: { id: lockedDelegation.id },
		update: lockedDelegation,
		create: lockedDelegation
	});
	const lockedMember = {
		...makeSeedDelegationMember({
			conferenceId: conference.id,
			delegationId: lockedDelegation.id,
			userId: delegate.id,
			isHeadDelegate: true
		}),
		id: 'e2e00000seatdelegationmember1',
		assignedCommitteeId: E2E_SEAT_GV_ID
	};
	await db.delegationMember.upsert({
		where: { id: lockedMember.id },
		update: lockedMember,
		create: lockedMember
	});

	const nsaDelegation = {
		...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
		id: NSA_DELEGATION_ID,
		assignedNonStateActorId: E2E_SEAT_ASSIGNED_NSA_ID
	};
	await db.delegation.upsert({
		where: { id: nsaDelegation.id },
		update: nsaDelegation,
		create: nsaDelegation
	});
}
