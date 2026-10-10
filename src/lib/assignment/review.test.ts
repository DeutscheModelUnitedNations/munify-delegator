import { describe, expect, it } from 'vitest';
import { reviewProblem, reviewRow } from './review';

const base = { flagged: false, disqualified: false };

describe('reviewProblem', () => {
	it('needs exactly one application', () => {
		expect(reviewProblem(base)).toBe('application');
		expect(reviewProblem({ ...base, delegationId: 'd', singleParticipantId: 's' })).toBe(
			'application'
		);
		expect(reviewProblem({ ...base, delegationId: 'd' })).toBeUndefined();
	});

	it('keeps ratings on the scale, unrated being fine', () => {
		expect(reviewProblem({ ...base, singleParticipantId: 's', evaluation: 0 })).toBe('evaluation');
		expect(reviewProblem({ ...base, singleParticipantId: 's', evaluation: 5.5 })).toBe(
			'evaluation'
		);
		expect(reviewProblem({ ...base, singleParticipantId: 's', evaluation: 5 })).toBeUndefined();
		expect(reviewProblem({ ...base, singleParticipantId: 's', evaluation: null })).toBeUndefined();
	});
});

describe('reviewRow', () => {
	it('names the application and the columns', () => {
		expect(reviewRow({ ...base, delegationId: 'd', evaluation: 3, note: '' })).toEqual({
			application: { kind: 'delegation', id: 'd' },
			keys: { delegationId: 'd', singleParticipantId: null },
			values: { evaluation: 3, flagged: false, disqualified: false, note: null }
		});
		expect(reviewRow({ ...base, singleParticipantId: 's', note: 'late' })).toMatchObject({
			application: { kind: 'single', id: 's' },
			keys: { delegationId: null, singleParticipantId: 's' },
			values: { evaluation: null, note: 'late' }
		});
	});
});
