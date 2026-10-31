import { describe, expect, it } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { reviewArgsSchema } from './review';

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

	it('refuses an application both required and excluded', () => {
		expect(issues({ ...base, delegationId: 'd', disqualified: true, required: true })).toEqual([
			m.assignmentReviewRequiredAndExcluded()
		]);
		expect(issues({ ...base, delegationId: 'd', required: true })).toEqual([]);
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
