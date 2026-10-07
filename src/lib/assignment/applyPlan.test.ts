import { describe, expect, it } from 'vitest';
import { planApply, planIsEmpty, type ApplyInput } from './applyPlan';
import type { DraftUnit, LiveDelegation } from './state';

const delegation = (
	id: string,
	memberCount: number,
	nationAlpha3Code: string | null = null
): LiveDelegation => ({
	id,
	nationAlpha3Code,
	nonStateActorId: null,
	members: Array.from({ length: memberCount }, (_, i) => ({
		id: `${id}-m${i}`,
		isHeadDelegate: i === 0
	}))
});

const unit = (
	id: string,
	source: string,
	nationAlpha3Code: string | null,
	memberIds: string[] = []
): DraftUnit => ({
	id,
	sourceDelegationId: source,
	sourceSingleParticipantId: null,
	nationAlpha3Code,
	nonStateActorId: null,
	memberIds
});

const input = (overrides: Partial<ApplyInput>): ApplyInput => ({
	delegations: [],
	singleParticipants: [],
	units: [],
	draftSingleRoles: [],
	seats: new Map([
		['nation:FRA', 2],
		['nation:GBR', 3],
		['nation:DEU', 4]
	]),
	...overrides
});

describe('planApply', () => {
	it('changes nothing without a draft', () => {
		const { plan, errors } = planApply(input({ delegations: [delegation('a', 2, 'FRA')] }));
		expect(errors).toEqual([]);
		expect(planIsEmpty(plan)).toBe(true);
	});

	it('gives a whole delegation its role in place', () => {
		const { plan, errors } = planApply(
			input({ delegations: [delegation('a', 2)], units: [unit('u', 'a', 'FRA')] })
		);
		expect(errors).toEqual([]);
		expect(plan.setTargets).toEqual([
			{ delegation: { existing: 'a' }, target: { nationAlpha3Code: 'FRA', nonStateActorId: null } }
		]);
		expect(plan.moveMembers).toEqual([]);
		expect(plan.deleteDelegations).toEqual([]);
	});

	it('merges into the delegation already holding the role and deletes the emptied one', () => {
		const { plan, errors } = planApply(
			input({
				delegations: [delegation('holder', 2, 'GBR'), delegation('b', 1)],
				units: [unit('u', 'b', 'GBR')]
			})
		);
		expect(errors).toEqual([]);
		expect(plan.setTargets).toEqual([]);
		expect(plan.moveMembers).toEqual([
			{ memberId: 'b-m0', to: { existing: 'holder' }, isHeadDelegate: false }
		]);
		expect(plan.deleteDelegations).toEqual(['b']);
		expect(plan.resetCommittees).toEqual(['b-m0']);
	});

	it('moves a role from one delegation to another, clearing before setting', () => {
		const { plan } = planApply(
			input({
				delegations: [delegation('a', 2, 'FRA'), delegation('b', 2)],
				units: [unit('ua', 'a', 'GBR'), unit('ub', 'b', 'FRA')]
			})
		);
		expect(plan.clearTargets).toEqual(['a']);
		expect(plan.setTargets).toHaveLength(2);
		expect(plan.resetCommittees.sort()).toEqual(['a-m0', 'a-m1', 'b-m0', 'b-m1']);
	});

	it('splits a delegation into new ones and deletes the original', () => {
		const { plan, errors } = planApply(
			input({
				delegations: [delegation('a', 3)],
				units: [unit('p1', 'a', 'FRA', ['a-m0', 'a-m1']), unit('p2', 'a', null, ['a-m2'])]
			})
		);
		expect(errors).toEqual([]);
		expect(plan.newDelegations).toEqual([
			{ copyFrom: { delegationId: 'a' } },
			{ copyFrom: { delegationId: 'a' } }
		]);
		expect(plan.moveMembers).toEqual([
			{ memberId: 'a-m0', to: { created: 0 }, isHeadDelegate: true },
			{ memberId: 'a-m1', to: { created: 0 }, isHeadDelegate: false },
			{ memberId: 'a-m2', to: { created: 1 }, isHeadDelegate: true }
		]);
		expect(plan.deleteDelegations).toEqual(['a']);
	});

	it('refuses a split that leaves somebody out', () => {
		const { errors } = planApply(
			input({
				delegations: [delegation('a', 3)],
				units: [unit('p1', 'a', 'FRA', ['a-m0', 'a-m1'])]
			})
		);
		expect(errors).toEqual([{ type: 'incompleteSplit', delegationId: 'a', memberIds: ['a-m2'] }]);
	});

	it('refuses more people on a role than it has seats', () => {
		const { errors } = planApply(
			input({ delegations: [delegation('a', 3)], units: [unit('u', 'a', 'FRA')] })
		);
		expect(errors).toEqual([
			{
				type: 'overCapacity',
				target: { nationAlpha3Code: 'FRA', nonStateActorId: null },
				seats: 2,
				assigned: 3
			}
		]);
	});

	it('refuses to delete a delegation that has papers', () => {
		const { errors } = planApply(
			input({
				delegations: [delegation('holder', 1, 'GBR'), { ...delegation('b', 1), hasPapers: true }],
				units: [unit('u', 'b', 'GBR')]
			})
		);
		expect(errors).toEqual([{ type: 'deletesPapers', delegationId: 'b' }]);
	});

	it('takes the role from a delegation the draft unassigns', () => {
		const { plan } = planApply(
			input({ delegations: [delegation('a', 2, 'FRA')], units: [unit('u', 'a', null)] })
		);
		expect(plan.clearTargets).toEqual(['a']);
		expect(plan.setTargets).toEqual([]);
		expect(plan.resetCommittees).toEqual(['a-m0', 'a-m1']);
	});

	it('turns a single participant into the head of a new delegation', () => {
		const { plan } = planApply(
			input({
				singleParticipants: [{ id: 's', roleId: null }],
				units: [
					{
						id: 'u',
						sourceDelegationId: null,
						sourceSingleParticipantId: 's',
						nationAlpha3Code: 'FRA',
						nonStateActorId: null,
						memberIds: []
					}
				]
			})
		);
		expect(plan.newDelegations).toEqual([{ copyFrom: { singleParticipantId: 's' } }]);
		expect(plan.convertSingles).toEqual([
			{ singleParticipantId: 's', to: { created: 0 }, isHeadDelegate: true }
		]);
	});

	it('applies pending single roles and warns about overfilled ones', () => {
		const { plan, warnings } = planApply(
			input({
				singleParticipants: [
					{ id: 's1', roleId: 'press' },
					{ id: 's2', roleId: null }
				],
				draftSingleRoles: [
					{ singleParticipantId: 's1', roleId: 'press' },
					{ singleParticipantId: 's2', roleId: 'press' }
				],
				roleSeats: new Map([['press', 1]])
			})
		);
		expect(plan.singleRoles).toEqual([{ singleParticipantId: 's2', roleId: 'press' }]);
		expect(warnings).toEqual([
			{ type: 'roleOverCapacity', roleId: 'press', seats: 1, assigned: 2 }
		]);
	});
});
