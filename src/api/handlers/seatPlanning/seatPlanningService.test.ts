import { describe, expect, test } from 'vitest';
import { lockedCommitteeSeats, seatCountSchema, totalSeats } from './seatPlanningService';

const member = (
	assignedCommitteeId: string | null,
	givenName = 'Ada',
	familyName = 'Lovelace'
) => ({
	assignedCommitteeId,
	user: { givenName, familyName }
});

describe('lockedCommitteeSeats', () => {
	test('groups the assigned members of a nation by committee', () => {
		const seats = lockedCommitteeSeats([
			{
				nationAlpha3Code: 'deu',
				members: [
					member('gv', 'ada', 'lovelace'),
					member('sr', 'grace', 'hopper'),
					member('gv', 'alan', 'turing'),
					member(null)
				]
			}
		]);

		expect(seats).toEqual([
			{ committeeId: 'gv', nationAlpha3Code: 'deu', memberNames: ['Ada Lovelace', 'Alan Turing'] },
			{ committeeId: 'sr', nationAlpha3Code: 'deu', memberNames: ['Grace Hopper'] }
		]);
	});

	test('ignores delegations without a nation (NSAs) and members without a committee', () => {
		expect(
			lockedCommitteeSeats([
				{ nationAlpha3Code: null, members: [member('gv')] },
				{ nationAlpha3Code: 'fra', members: [member(null)] }
			])
		).toEqual([]);
	});
});

describe('seatCountSchema', () => {
	test('needs at least one seat', () => {
		expect(seatCountSchema.safeParse(0).success).toBe(false);
		expect(seatCountSchema.safeParse(1).success).toBe(true);
	});
});

describe('totalSeats', () => {
	test('weights nation entries by seats per delegation and adds the NSA seat amounts', () => {
		const committees = [
			{
				numOfSeatsPerDelegation: 1,
				roles: [{ id: 'nation-deu' }, { id: 'nation-fra' }, { id: 'nation-usa' }]
			},
			{ numOfSeatsPerDelegation: 2, roles: [{ id: 'nation-deu' }, { id: 'nation-chn' }] },
			{ numOfSeatsPerDelegation: 3, roles: [] }
		];
		expect(totalSeats({ committees, nonStateActors: [{ seatAmount: 5 }, { seatAmount: 1 }] })).toBe(
			3 + 4 + 6
		);
	});

	test('is zero for a conference without seats', () => {
		expect(totalSeats({ committees: [], nonStateActors: [] })).toBe(0);
	});
});
