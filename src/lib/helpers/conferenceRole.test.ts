import { describe, expect, it } from 'vitest';
import { roleSeats, splitRole } from './conferenceRole';

describe('splitRole', () => {
	const france = { alpha3Code: 'FRA' };

	it('is neither a nation nor a non-state actor without a role', () => {
		expect(splitRole(null)).toEqual({ nation: null, nonStateActor: null });
		expect(splitRole(undefined)).toEqual({ nation: null, nonStateActor: null });
	});

	it('gives a nation role its nation', () => {
		expect(splitRole({ kind: 'NATION', nation: france })).toEqual({
			nation: france,
			nonStateActor: null
		});
		expect(splitRole({ kind: 'NATION', nation: null })).toEqual({
			nation: null,
			nonStateActor: null
		});
	});

	it('gives a non-state actor role itself', () => {
		const greenpeace = { kind: 'NON_STATE_ACTOR' as const, name: 'Greenpeace' };
		expect(splitRole(greenpeace)).toEqual({ nation: null, nonStateActor: greenpeace });
	});

	it('is neither for a custom role, even one carrying a nation', () => {
		expect(splitRole({ kind: 'CUSTOM', nation: france })).toEqual({
			nation: null,
			nonStateActor: null
		});
	});
});

describe('roleSeats', () => {
	const committees = [
		{ numOfSeatsPerDelegation: 2, roles: [{ id: 'nation-fra' }, { id: 'nation-deu' }] },
		{ numOfSeatsPerDelegation: 1, roles: [{ id: 'nation-fra' }] }
	];

	it('sums the seats of every committee a nation sits in', () => {
		expect(
			roleSeats({ role: { id: 'nation-fra', kind: 'NATION', seatAmount: null }, committees })
		).toBe(3);
		expect(
			roleSeats({ role: { id: 'nation-deu', kind: 'NATION', seatAmount: 5 }, committees })
		).toBe(2);
		expect(
			roleSeats({ role: { id: 'nation-usa', kind: 'NATION', seatAmount: null }, committees })
		).toBe(0);
	});

	it('takes the seat amount of a non-state actor or custom role', () => {
		expect(
			roleSeats({
				role: { id: 'nsa-greenpeace', kind: 'NON_STATE_ACTOR', seatAmount: 4 },
				committees
			})
		).toBe(4);
		expect(roleSeats({ role: { id: 'press', kind: 'CUSTOM', seatAmount: 1 }, committees })).toBe(1);
		expect(roleSeats({ role: { id: 'press', kind: 'CUSTOM', seatAmount: null }, committees })).toBe(
			0
		);
	});
});
