import { beforeEach, describe, expect, it, vi } from 'vitest';

/** What the fake transaction was asked to do, in order. */
const steps: string[] = [];
const tx = {
	select: () => {
		const chain = {
			from: () => chain,
			where: () => chain,
			for: async (mode: string) => void steps.push(`lock ${mode}`)
		};
		return chain;
	},
	query: {
		assignmentUnit: {
			findMany: async () => {
				steps.push('read units');
				return [];
			}
		}
	},
	insert: () => ({
		values: () => {
			steps.push('insert');
			return Object.assign(Promise.resolve(), { returning: async () => [{ id: 'unit' }] });
		}
	}),
	update: () => ({ set: () => ({ where: async () => void steps.push('update') }) }),
	delete: () => ({ where: async () => void steps.push('delete units') })
};
vi.mock('#api/db/db', () => ({
	db: { transaction: (run: (transaction: typeof tx) => Promise<unknown>) => run(tx) },
	schema: new Proxy({}, { get: () => ({}) })
}));
vi.mock('#api/db/whereRows', () => ({ whereRows: () => undefined }));
vi.mock('#api/pubsub', () => {
	const pubsub = { created: () => {}, updated: () => {}, removed: () => {} };
	return new Proxy({}, { get: () => pubsub, has: () => true });
});
import { m } from '#lib/paraglide/messages';
import {
	planDelegationRole,
	reviewArgsSchema,
	splitDelegation,
	writeGroupPlan
} from './assignmentService';
import type { AssignmentGroup } from '#lib/assignment/state';

describe("writes to a delegation's units", () => {
	beforeEach(() => {
		steps.length = 0;
	});

	it('lock the delegation before planning reads its units', async () => {
		await planDelegationRole({
			delegation: { id: 'd', conferenceId: 'c', assignedRoleId: null },
			roleId: 'r'
		});
		expect(steps).toEqual(['lock no key update', 'read units', 'insert']);
	});

	it('lock the delegation before a split replaces its units', async () => {
		await splitDelegation({
			delegation: { id: 'd', conferenceId: 'c' },
			parts: [['a'], ['b']]
		});
		expect(steps[0]).toBe('lock no key update');
		expect(steps[1]).toBe('delete units');
	});
});

describe('writeGroupPlan', () => {
	const group: AssignmentGroup = {
		key: 'd',
		unitId: null,
		delegationId: 'd',
		singleParticipantId: null,
		memberIds: ['a', 'b'],
		size: 2,
		whole: true,
		part: false,
		target: { roleId: 'r' },
		liveTarget: { roleId: 'live' },
		pending: true
	};
	/** What planning `roleId` for the group asks of the transaction. */
	async function stepsFor(changes: Partial<AssignmentGroup>, roleId: string | null) {
		steps.length = 0;
		// TYPE-SAFETY-EXCEPTION: the fake transaction above, with only the calls the writers make
		await writeGroupPlan({
			tx: tx as never,
			conferenceId: 'c',
			group: { ...group, ...changes },
			roleId
		});
		return [...steps];
	}

	it('plans a part of a split or a converted single participant through its unit', async () => {
		expect(await stepsFor({ unitId: 'u', part: true, whole: false }, 'r')).toEqual(['update']);
		expect(
			await stepsFor({ unitId: 'u', delegationId: null, singleParticipantId: 's' }, null)
		).toEqual(['update']);
	});

	it('plans a whole delegation for the delegation, even when it has a unit', async () => {
		expect(await stepsFor({}, 'r')).toEqual(['lock no key update', 'read units', 'insert']);
		expect(await stepsFor({ unitId: 'u' }, 'r')).toEqual([
			'lock no key update',
			'read units',
			'insert'
		]);
	});

	it('drops the plan of a delegation given back the role it holds', async () => {
		expect(await stepsFor({}, 'live')).toEqual([
			'lock no key update',
			'read units',
			'delete units'
		]);
	});

	it('writes nothing for a group without a unit or a delegation', async () => {
		expect(await stepsFor({ delegationId: null, singleParticipantId: 's' }, 'r')).toEqual([]);
	});
});

const base = { flagged: false, disqualified: false };

/** The messages a review is refused with, or none when it passes. */
const issues = (args: object) =>
	reviewArgsSchema.safeParse(args).error?.issues.map((issue) => issue.message) ?? [];

describe('reviewArgsSchema', () => {
	it('needs exactly one application', () => {
		const message = m.assignmentReviewNameOneApplication();
		expect(issues(base)).toEqual([message]);
		expect(issues({ ...base, delegationId: 'd', singleParticipantId: 's' })).toEqual([message]);
		expect(issues({ ...base, delegationId: 'd' })).toEqual([]);
	});

	it('keeps ratings on the scale, unrated being fine', () => {
		const message = m.assignmentReviewRatingRange();
		expect(issues({ ...base, singleParticipantId: 's', evaluation: 0 })).toEqual([message]);
		expect(issues({ ...base, singleParticipantId: 's', evaluation: 5.5 })).toEqual([message]);
		expect(issues({ ...base, singleParticipantId: 's', evaluation: 5 })).toEqual([]);
		expect(issues({ ...base, singleParticipantId: 's', evaluation: null })).toEqual([]);
	});

	it('names the application and the columns', () => {
		expect(reviewArgsSchema.parse({ ...base, delegationId: 'd', evaluation: 3, note: '' })).toEqual(
			{
				application: { kind: 'delegation', id: 'd' },
				keys: { delegationId: 'd', singleParticipantId: null },
				changes: {
					evaluation: 3,
					flagged: false,
					disqualified: false,
					required: undefined,
					note: null
				}
			}
		);
		expect(reviewArgsSchema.parse({ singleParticipantId: 's', note: 'late' })).toMatchObject({
			application: { kind: 'single', id: 's' },
			keys: { delegationId: null, singleParticipantId: 's' },
			changes: { note: 'late' }
		});
	});

	it('changes only the fields given', () => {
		expect(reviewArgsSchema.parse({ delegationId: 'd', flagged: true }).changes).toEqual({
			evaluation: undefined,
			flagged: true,
			disqualified: undefined,
			required: undefined,
			note: undefined
		});
	});

	it('clears the rating and the note with null, never the flags', () => {
		expect(
			reviewArgsSchema.parse({
				delegationId: 'd',
				evaluation: null,
				note: null,
				flagged: null,
				disqualified: null,
				required: null
			}).changes
		).toEqual({
			evaluation: null,
			flagged: undefined,
			disqualified: undefined,
			required: undefined,
			note: null
		});
	});
});
