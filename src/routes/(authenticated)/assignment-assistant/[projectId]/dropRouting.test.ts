import { describe, expect, test, vi } from 'vitest';
import {
	dropMove,
	isRoleContainer,
	movedBetweenBuckets,
	planRoleAssignment,
	routeSingleDrop
} from './dropRouting';

describe('dropMove', () => {
	test('describes a drop into another container', () => {
		expect(
			dropMove({ draggedItem: { id: 'd1' }, sourceContainer: 'pool', targetContainer: 'nsa-x' })
		).toEqual({ itemId: 'd1', source: 'pool', target: 'nsa-x' });
	});

	test('ignores drops outside a container, into the same one, or without an item', () => {
		expect(
			dropMove({ draggedItem: { id: 'd1' }, sourceContainer: 'pool', targetContainer: null })
		).toBeUndefined();
		expect(
			dropMove({ draggedItem: { id: 'd1' }, sourceContainer: 'pool', targetContainer: 'pool' })
		).toBeUndefined();
		expect(
			dropMove({ draggedItem: { id: '' }, sourceContainer: 'pool', targetContainer: 'nsa-x' })
		).toBeUndefined();
	});
});

describe('isRoleContainer', () => {
	test('recognises nation and NSA drop zones', () => {
		expect(isRoleContainer('nations-deu')).toBe(true);
		expect(isRoleContainer('nsa-123')).toBe(true);
		expect(isRoleContainer('pool')).toBe(false);
		expect(isRoleContainer('options')).toBe(false);
	});
});

describe('planRoleAssignment', () => {
	const germany = { alpha3Code: 'deu' };
	const sources = {
		nations: [{ nation: germany }],
		nsas: [{ id: 'gp' }],
		remainingSeats: () => 3
	};

	test('assigns a nation with enough free seats', () => {
		expect(planRoleAssignment('nations-deu', 3, sources)).toEqual({
			action: 'nation',
			identifier: 'deu'
		});
	});

	test('refuses a nation without enough free seats', () => {
		expect(planRoleAssignment('nations-deu', 4, sources)).toEqual({
			action: 'full',
			identifier: 'deu'
		});
	});

	test('assigns a known NSA', () => {
		expect(planRoleAssignment('nsa-gp', 10, sources)).toEqual({ action: 'nsa', identifier: 'gp' });
	});

	test('does nothing for unknown or malformed containers', () => {
		expect(planRoleAssignment('nsa-unknown', 1, sources)).toBeUndefined();
		expect(planRoleAssignment('nations', 1, sources)).toBeUndefined();
	});
});

describe('routeSingleDrop', () => {
	const route = (target: string) => {
		const actions = { unassign: vi.fn(), convert: vi.fn(), assign: vi.fn() };
		routeSingleDrop({ itemId: 's1', source: 'pool', target }, actions);
		return actions;
	};

	test('unassigns when dropped back into the pool', () => {
		const actions = route('backToPool');
		expect(actions.unassign).toHaveBeenCalledWith('s1');
		expect(actions.convert).not.toHaveBeenCalled();
		expect(actions.assign).not.toHaveBeenCalled();
	});

	test('converts when dropped on the conversion zone', () => {
		expect(route('convertToDelegation').convert).toHaveBeenCalledWith('s1');
	});

	test('assigns the role a role zone stands for', () => {
		expect(route('role-r1').assign).toHaveBeenCalledWith('s1', 'r1');
	});

	test('ignores other zones', () => {
		const actions = route('elsewhere');
		expect(actions.unassign).not.toHaveBeenCalled();
		expect(actions.convert).not.toHaveBeenCalled();
		expect(actions.assign).not.toHaveBeenCalled();
	});
});

describe('movedBetweenBuckets', () => {
	test('moves a member from one bucket to the end of another', () => {
		const a = { user: { id: 'a' } };
		const b = { user: { id: 'b' } };
		const c = { user: { id: 'c' } };
		const buckets = [[a, b], [c]];
		const result = movedBetweenBuckets(
			buckets,
			{ itemId: 'a', source: 'bucket-0', target: 'bucket-1' },
			a
		);
		expect(result).toEqual([[b], [c, a]]);
		expect(buckets).toEqual([[a, b], [c]]);
	});
});
