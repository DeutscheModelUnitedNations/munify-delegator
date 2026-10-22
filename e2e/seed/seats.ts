/**
 * Fixtures for the seats overview specs (e2e/management/seats.spec.ts).
 *
 * A separate conference, because the specs move delegates between seats. Every run resets it to
 * the state below. GV and SR have one seat per delegation, and Germany, France and Italy sit in
 * both:
 * - Germany: Anna Alpha (head delegate, GV) and Bert Beta (SR)
 * - France: Carla Gamma (head delegate, GV) and Dora Delta, who has no committee yet
 * - Italy: no delegation, so both its seats are free
 */
import { ConferenceState, type PrismaClient } from '@prisma/client';
import { makeSeedConference } from '../../prisma/seed/dev/conference';
import { makeSeedDelegation } from '../../prisma/seed/dev/delegation';
import { makeSeedDelegationMember } from '../../prisma/seed/dev/delegationMember';
import { makeSeedTeamMember } from '../../prisma/seed/dev/teamMember';
import { makeSeedUser } from '../../prisma/seed/dev/user';

export const E2E_SEATS_CONFERENCE_ID = 'e2e00000conference0000004';
export const E2E_SEATS_GV_ID = 'e2e00000seatscommittee0001';
export const E2E_SEATS_SR_ID = 'e2e00000seatscommittee0002';
export const E2E_SEATS_PARTICIPANT_CARE_ID = 'e2e-seats-pc';
export const E2E_SEATS_GERMANY_DELEGATION_ID = 'e2e00000seatsdelegation001';
export const E2E_SEATS_FRANCE_DELEGATION_ID = 'e2e00000seatsdelegation002';

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

export async function seedSeats(db: PrismaClient) {
	const conference = {
		...makeSeedConference({ state: ConferenceState.PARTICIPANT_REGISTRATION }),
		id: E2E_SEATS_CONFERENCE_ID,
		title: 'E2E Seats Conference'
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

	const committees = [
		{ id: E2E_SEATS_GV_ID, name: 'Generalversammlung', abbreviation: 'STGV' },
		{ id: E2E_SEATS_SR_ID, name: 'Sicherheitsrat', abbreviation: 'STSR' }
	];
	for (const [index, { id, name, abbreviation }] of committees.entries()) {
		const data = {
			conferenceId: conference.id,
			name,
			abbreviation,
			numOfSeatsPerDelegation: 1,
			// fixed order of the table columns
			createdAt: new Date(2026, 0, 1 + index),
			nations: { set: Object.keys(NATIONS).map((alpha3Code) => ({ alpha3Code })) }
		};
		await db.committee.upsert({
			where: { id },
			update: data,
			create: { ...data, id, nations: { connect: data.nations.set } }
		});
	}

	const users = [
		{ id: E2E_SEATS_PARTICIPANT_CARE_ID, given_name: 'E2E', family_name: 'SeatsCare' },
		...Object.values(E2E_SEATS_DELEGATES).map((x) => ({
			id: x.id,
			given_name: x.given,
			family_name: x.family
		}))
	];
	for (const overrides of users) {
		const user = { ...makeSeedUser(), ...overrides, email: `${overrides.id}@e2e.test` };
		await db.user.upsert({ where: { id: user.id }, update: user, create: user });
	}

	const teamMember = {
		...makeSeedTeamMember({
			conferenceId: conference.id,
			userId: E2E_SEATS_PARTICIPANT_CARE_ID,
			role: 'PARTICIPANT_CARE'
		}),
		id: `e2e-team-${E2E_SEATS_PARTICIPANT_CARE_ID}`
	};
	await db.teamMember.upsert({
		where: { id: teamMember.id },
		update: teamMember,
		create: teamMember
	});

	// the specs move delegates and create delegations (e.g. Italy's), so start from scratch
	await db.delegationMember.deleteMany({ where: { conferenceId: conference.id } });
	await db.delegation.deleteMany({ where: { conferenceId: conference.id } });

	const delegations = [
		{ id: E2E_SEATS_GERMANY_DELEGATION_ID, nation: 'deu', school: 'E2E Schule Berlin' },
		{ id: E2E_SEATS_FRANCE_DELEGATION_ID, nation: 'fra', school: 'E2E Schule Paris' }
	];
	for (const { id, nation, school } of delegations) {
		await db.delegation.create({
			data: {
				...makeSeedDelegation({ conferenceId: conference.id, applied: true }),
				id,
				school,
				assignedNationAlpha3Code: nation
			}
		});
	}

	const { anna, bert, carla, dora } = E2E_SEATS_DELEGATES;
	const members = [
		[anna, E2E_SEATS_GERMANY_DELEGATION_ID, E2E_SEATS_GV_ID, true],
		[bert, E2E_SEATS_GERMANY_DELEGATION_ID, E2E_SEATS_SR_ID, false],
		[carla, E2E_SEATS_FRANCE_DELEGATION_ID, E2E_SEATS_GV_ID, true],
		[dora, E2E_SEATS_FRANCE_DELEGATION_ID, null, false]
	] as const;
	for (const [delegate, delegationId, assignedCommitteeId, isHeadDelegate] of members) {
		await db.delegationMember.create({
			data: {
				...makeSeedDelegationMember({
					conferenceId: conference.id,
					delegationId,
					userId: delegate.id,
					assignedCommitteeId,
					isHeadDelegate
				}),
				id: delegate.memberId
			}
		});
	}
}
