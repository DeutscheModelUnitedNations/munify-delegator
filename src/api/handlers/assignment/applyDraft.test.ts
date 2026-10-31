import { describe, expect, it, vi } from 'vitest';
import type { ApplyPlan } from '#lib/assignment/applyPlan';

vi.mock('#api/db/db', () => ({ db: {} }));
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
const { db } = await import('#api/db/db');
const { announceAppliedPlan, announceDraftWrite } = await import('./applyDraft');

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

describe('announceDraftWrite', () => {
	it('announces a write outside a transaction', () => {
		vi.clearAllMocks();
		announceDraftWrite(db);
		expect(pubsub.assignmentUnitPubsub.created).toHaveBeenCalledOnce();
	});

	it('leaves a write inside a transaction to whoever commits it', () => {
		vi.clearAllMocks();
		// Any other handle than `db` stands for a transaction.
		announceDraftWrite(structuredClone(db));
		expect(pubsub.assignmentUnitPubsub.created).not.toHaveBeenCalled();
	});
});
