import { describe, expect, it, vi } from 'vitest';
import type { ApplyPlan } from '#lib/assignment/applyPlan';

vi.mock('#api/db/db', () => ({ db: {}, schema: new Proxy({}, { get: () => ({}) }) }));
vi.mock('#api/pubsub', () => {
	const fake = () => ({ created: vi.fn(), removed: vi.fn(), updated: vi.fn() });
	return {
		assignmentReviewPubsub: fake(),
		assignmentSingleRolePubsub: fake(),
		assignmentUnitMemberPubsub: fake(),
		assignmentUnitPubsub: fake(),
		delegationMemberPubsub: fake(),
		delegationPubsub: fake(),
		singleParticipantPubsub: fake()
	};
});

const pubsub = await import('#api/pubsub');
const { announceAppliedPlan, createDelegations, describeApplyErrors } =
	await import('./applyDraft');
const { m } = await import('#lib/paraglide/messages');

const emptyPlan: ApplyPlan = {
	newDelegations: [],
	clearTargets: [],
	setTargets: [],
	moveMembers: [],
	resetCommittees: [],
	convertSingles: [],
	deleteDelegations: [],
	singleRoles: []
};

describe('announceAppliedPlan', () => {
	it('announces the rows changed in place by their ids', () => {
		vi.clearAllMocks();
		announceAppliedPlan({
			...emptyPlan,
			clearTargets: ['d1', 'gone'],
			setTargets: [
				{ delegation: { existing: 'd2' }, target: { roleId: 'r1' } },
				{ delegation: { created: 0 }, target: { roleId: 'r2' } }
			],
			moveMembers: [{ memberId: 'm1', to: { existing: 'd2' }, isHeadDelegate: false }],
			resetCommittees: ['m2'],
			deleteDelegations: ['gone'],
			singleRoles: [{ singleParticipantId: 's1', roleId: 'r3' }]
		});
		expect(pubsub.delegationPubsub.updated).toHaveBeenCalledWith(['d1', 'd2']);
		expect(pubsub.delegationMemberPubsub.updated).toHaveBeenCalledWith(['m1', 'm2']);
		expect(pubsub.singleParticipantPubsub.updated).toHaveBeenCalledWith(['s1']);
	});

	it('announces the cleared draft', () => {
		vi.clearAllMocks();
		announceAppliedPlan(emptyPlan);
		expect(pubsub.assignmentUnitPubsub.created).toHaveBeenCalledOnce();
		expect(pubsub.assignmentSingleRolePubsub.created).toHaveBeenCalledOnce();
		expect(pubsub.delegationPubsub.updated).not.toHaveBeenCalled();
	});
});

describe('describeApplyErrors', () => {
	it('words every error on a line of its own, naming the role', () => {
		const roleNames = new Map([['r1', 'France']]);
		expect(
			describeApplyErrors({
				errors: [
					{ type: 'incompleteSplit', delegationId: 'd1', memberIds: ['a', 'b'] },
					{ type: 'overCapacity', target: { roleId: 'r1' }, seats: 2, assigned: 3 },
					{ type: 'overCapacity', target: { roleId: null }, seats: 0, assigned: 1 },
					{ type: 'deletesPapers', delegationId: 'd2' }
				],
				roleNames
			}).split('\n')
		).toEqual([
			m.assignmentErrorIncompleteSplit({ count: 2 }),
			m.assignmentErrorOverCapacity({ role: 'France', seats: 2, assigned: 3 }),
			m.assignmentErrorOverCapacity({ role: '', seats: 0, assigned: 1 }),
			m.assignmentErrorDeletesPapers()
		]);
	});
});

describe('createDelegations', () => {
	it('creates a delegation per new one, with the texts of the application it comes from', async () => {
		const inserted: Record<string, unknown>[] = [];
		const tx = {
			query: {
				delegation: {
					findFirst: async () => ({ motivation: 'from delegation', experience: 'lots' })
				},
				singleParticipant: { findFirst: async () => undefined }
			},
			insert: () => ({
				values: (values: Record<string, unknown>) => {
					inserted.push(values);
					return { returning: async () => [{ id: `new${inserted.length}` }] };
				}
			})
		};
		const delegationIdOf = await createDelegations({
			// TYPE-SAFETY-EXCEPTION: a fake with only the calls createDelegations makes
			tx: tx as never,
			conferenceId: 'c',
			plan: {
				...emptyPlan,
				newDelegations: [
					{ copyFrom: { delegationId: 'd1' } },
					{ copyFrom: { singleParticipantId: 's1' } }
				]
			}
		});
		expect(inserted).toMatchObject([
			{ conferenceId: 'c', applied: true, motivation: 'from delegation', experience: 'lots' },
			{ conferenceId: 'c', applied: true, motivation: undefined, experience: undefined }
		]);
		expect(delegationIdOf({ created: 1 })).toBe('new2');
		expect(delegationIdOf({ existing: 'd9' })).toBe('d9');
	});
});
