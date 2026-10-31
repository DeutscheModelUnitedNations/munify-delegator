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
import { planDelegationRole, reviewArgsSchema, splitDelegation } from './assignmentService';

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
