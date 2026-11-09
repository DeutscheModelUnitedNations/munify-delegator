import { describe, expect, test } from 'vitest';
import {
	prioritizedApplicationOf,
	prioritizedElsewhere,
	requiredApplicationOf,
	requiredWithoutSeat,
	seatOccupancy
} from './seatChecks';

test('requiredApplicationOf reads which application a review row is about', () => {
	expect(requiredApplicationOf({ delegationId: 'd', singleParticipantId: null })).toEqual([
		{ delegationId: 'd' }
	]);
	expect(requiredApplicationOf({ singleParticipantId: 's' })).toEqual([
		{ singleParticipantId: 's' }
	]);
	expect(requiredApplicationOf({ delegationId: 'd', delegation: { memberCount: 4 } })).toEqual([
		{ delegationId: 'd', size: 4 }
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
			requiredWithoutSeat({
				required: [
					{ delegationId: 'seated' },
					{ delegationId: 'left' },
					{ delegationId: 'untouched' }
				],
				state
			})
		).toEqual([{ delegationId: 'left' }, { delegationId: 'untouched' }]);
	});

	test('counts a split delegation as seated only when every part is', () => {
		const state = {
			groups: [group('split', 'fra', 1), group('split', null, 1), group('whole', 'gbr')],
			singles: []
		};
		expect(
			requiredWithoutSeat({
				required: [{ delegationId: 'split' }, { delegationId: 'whole' }],
				state
			})
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
			requiredWithoutSeat({
				required: [
					{ singleParticipantId: 'press' },
					{ singleParticipantId: 'converted' },
					{ singleParticipantId: 'waiting' }
				],
				state
			})
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
			seatOccupancy({
				state,
				seats: new Map([
					['fra', 2],
					['gbr', 2]
				]),
				roleSeats: new Map([['press', 2]])
			})
		).toEqual({ total: 6, taken: 5, free: 1 });
	});

	test('never counts fewer than no free seats', () => {
		expect(
			seatOccupancy({
				state: { groups: [group('a', 'fra', 3)], singles: [] },
				seats: new Map([['fra', 2]]),
				roleSeats: new Map()
			})
		).toEqual({ total: 2, taken: 3, free: 0 });
	});
});

test('prioritizedApplicationOf reads the prioritized wish of a review row', () => {
	expect(prioritizedApplicationOf({ delegationId: 'd', prioritizedRoleId: 'fra' })).toEqual([
		{ delegationId: 'd', roleId: 'fra' }
	]);
	expect(
		prioritizedApplicationOf({ singleParticipantId: 's', prioritizedRoleId: 'press' })
	).toEqual([{ singleParticipantId: 's', roleId: 'press' }]);
	expect(prioritizedApplicationOf({ delegationId: 'd', prioritizedRoleId: null })).toEqual([]);
});

describe('prioritizedElsewhere', () => {
	const state = {
		groups: [
			group('onIt', 'fra'),
			group('elsewhere', 'chn'),
			group('split', 'gbr'),
			group('split', 'fra'),
			group('unseated', null),
			group(null, 'usa', 1, 'converted')
		],
		singles: [
			{ singleParticipantId: 'press', roleId: 'press' },
			{ singleParticipantId: 'judge', roleId: 'judge' },
			{ singleParticipantId: 'waiting', roleId: null }
		]
	};

	test('lists seated applications holding another role than the prioritized one', () => {
		const found = prioritizedElsewhere({
			prioritized: [
				{ delegationId: 'onIt', roleId: 'fra' },
				{ delegationId: 'elsewhere', roleId: 'fra' },
				{ singleParticipantId: 'judge', roleId: 'press' },
				{ singleParticipantId: 'press', roleId: 'press' },
				{ singleParticipantId: 'converted', roleId: 'press' }
			],
			state
		});
		expect(found).toEqual([
			{ application: { delegationId: 'elsewhere', roleId: 'fra' }, heldRoleIds: ['chn'] },
			{ application: { singleParticipantId: 'judge', roleId: 'press' }, heldRoleIds: ['judge'] },
			{
				application: { singleParticipantId: 'converted', roleId: 'press' },
				heldRoleIds: ['usa']
			}
		]);
	});

	test('leaves out applications without a seat and split delegations with a part on it', () => {
		expect(
			prioritizedElsewhere({
				prioritized: [
					{ delegationId: 'split', roleId: 'fra' },
					{ delegationId: 'unseated', roleId: 'fra' },
					{ delegationId: 'notOnBoard', roleId: 'fra' },
					{ singleParticipantId: 'waiting', roleId: 'press' }
				],
				state
			})
		).toEqual([]);
	});
});
