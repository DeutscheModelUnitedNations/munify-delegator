import { describe, expect, test } from 'vitest';
import { requiredApplicationOf, requiredWithoutSeat, seatOccupancy } from './seatChecks';

test('requiredApplicationOf reads which application a review row is about', () => {
	expect(requiredApplicationOf({ delegationId: 'd', singleParticipantId: null })).toEqual([
		{ delegationId: 'd' }
	]);
	expect(requiredApplicationOf({ singleParticipantId: 's' })).toEqual([
		{ singleParticipantId: 's' }
	]);
	expect(requiredApplicationOf({})).toEqual([]);
});

const group = (
	delegationId: string | null,
	roleId: string | null,
	size = 2,
	singleParticipantId: string | null = null
) => ({ delegationId, singleParticipantId, target: { roleId }, size });

describe('requiredWithoutSeat', () => {
	test('finds required delegations the plan leaves without a role, or does not hold at all', () => {
		const state = {
			groups: [group('seated', 'fra'), group('left', null)],
			singles: []
		};
		expect(
			requiredWithoutSeat(
				[{ delegationId: 'seated' }, { delegationId: 'left' }, { delegationId: 'untouched' }],
				state
			)
		).toEqual([{ delegationId: 'left' }, { delegationId: 'untouched' }]);
	});

	test('counts a split delegation as seated only when every part is', () => {
		const state = {
			groups: [group('split', 'fra', 1), group('split', null, 1), group('whole', 'gbr')],
			singles: []
		};
		expect(
			requiredWithoutSeat([{ delegationId: 'split' }, { delegationId: 'whole' }], state)
		).toEqual([{ delegationId: 'split' }]);
	});

	test('seats a single by a custom role or by the delegation it is turned into', () => {
		const state = {
			groups: [group(null, 'deu', 1, 'converted')],
			singles: [
				{ singleParticipantId: 'press', roleId: 'role-press' },
				{ singleParticipantId: 'waiting', roleId: null }
			]
		};
		expect(
			requiredWithoutSeat(
				[
					{ singleParticipantId: 'press' },
					{ singleParticipantId: 'converted' },
					{ singleParticipantId: 'waiting' }
				],
				state
			)
		).toEqual([{ singleParticipantId: 'waiting' }]);
	});
});

describe('seatOccupancy', () => {
	test('adds up every role, and what the plan fills of them', () => {
		const state = {
			groups: [group('a', 'fra', 2), group('b', null, 3), group('c', 'gbr', 2)],
			singles: [
				{ singleParticipantId: 's1', roleId: 'press' },
				{ singleParticipantId: 's2', roleId: null }
			]
		};
		expect(
			seatOccupancy(
				state,
				new Map([
					['fra', 2],
					['gbr', 2]
				]),
				new Map([['press', 2]])
			)
		).toEqual({ total: 6, taken: 5, free: 1 });
	});

	test('never counts fewer than no free seats', () => {
		expect(
			seatOccupancy(
				{ groups: [group('a', 'fra', 3)], singles: [] },
				new Map([['fra', 2]]),
				new Map()
			)
		).toEqual({ total: 2, taken: 3, free: 0 });
	});
});
