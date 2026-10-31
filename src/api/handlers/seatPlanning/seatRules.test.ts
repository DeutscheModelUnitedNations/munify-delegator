import { describe, expect, test } from 'vitest';
import { lockedCommitteeSeats, seatCountSchema } from './seatRules';

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
