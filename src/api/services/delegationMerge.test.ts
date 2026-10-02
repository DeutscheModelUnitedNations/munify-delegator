import { describe, expect, test } from 'vitest';
import { planDelegationMerge, supervisionLinks } from './delegationMerge';

const assigned = (...userIds: string[]) => ({ members: userIds.map((id) => ({ user: { id } })) });
const existing = (id: string, ...userIds: string[]) => ({
	id,
	members: userIds.map((userId) => ({ userId }))
});

describe('planDelegationMerge', () => {
	test('carries the role on the smallest delegation and moves everyone else onto it', () => {
		const plan = planDelegationMerge(
			[assigned('a', 'b', 'c'), assigned('d')],
			[existing('big', 'a', 'b', 'c'), existing('small', 'd')]
		);
		expect(plan).toEqual({
			primaryId: 'small',
			leavingUserIds: ['a', 'b', 'c'],
			newMembers: [
				{ userId: 'a', isHeadDelegate: false },
				{ userId: 'b', isHeadDelegate: false },
				{ userId: 'c', isHeadDelegate: false }
			]
		});
	});

	test('moves nobody when the carrier holds everyone already', () => {
		expect(planDelegationMerge([assigned('a')], [existing('d1', 'a')])).toEqual({
			primaryId: 'd1',
			leavingUserIds: [],
			newMembers: []
		});
	});

	test('fills a brand new delegation, with the first member as head delegate', () => {
		expect(planDelegationMerge([assigned('a', 'b')], [])).toEqual({
			primaryId: undefined,
			leavingUserIds: [],
			newMembers: [
				{ userId: 'a', isHeadDelegate: true },
				{ userId: 'b', isHeadDelegate: false }
			]
		});
	});

	test('leaves the fetched delegations in their order', () => {
		const delegations = [existing('big', 'a', 'b'), existing('small', 'c')];
		planDelegationMerge([], delegations);
		expect(delegations.map((d) => d.id)).toEqual(['big', 'small']);
	});
});

describe('supervisionLinks', () => {
	test('pairs every supervisor with each member they supervise', () => {
		expect(
			supervisionLinks({
				members: [
					{ id: 'm1', supervisors: [{ id: 's1' }, { id: 's2' }] },
					{ id: 'm2', supervisors: [] },
					{ id: 'm3', supervisors: null },
					{ id: 'm4' },
					{ id: 'm5', supervisors: [{ id: 's1' }] }
				]
			})
		).toEqual([
			{ supervisorId: 's1', memberId: 'm1' },
			{ supervisorId: 's2', memberId: 'm1' },
			{ supervisorId: 's1', memberId: 'm5' }
		]);
	});

	test('has nothing to restore for a missing delegation', () => {
		expect(supervisionLinks(undefined)).toEqual([]);
	});
});
