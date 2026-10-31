import { describe, expect, it } from 'vitest';
import { assignmentWeightsArgsSchema } from './assignmentWeights';

describe('assignmentWeightsArgsSchema', () => {
	it('lets weights be left out or null', () => {
		expect(assignmentWeightsArgsSchema.safeParse({ conferenceId: 'c' }).success).toBe(true);
		expect(assignmentWeightsArgsSchema.safeParse({ nullRating: null, markBonus: 3 }).success).toBe(
			true
		);
	});

	it('refuses a weight out of range', () => {
		expect(assignmentWeightsArgsSchema.safeParse({ nullRating: 1e300 }).success).toBe(false);
		expect(assignmentWeightsArgsSchema.safeParse({ ratingFactor: -1 }).success).toBe(false);
	});
});
