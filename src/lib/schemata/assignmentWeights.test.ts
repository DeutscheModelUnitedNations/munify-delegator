import { describe, expect, it } from 'vitest';
import { assignmentWeightsArgsSchema } from './assignmentWeights';

describe('assignmentWeightsArgsSchema', () => {
	it('lets weights be left out or null', () => {
		expect(assignmentWeightsArgsSchema.safeParse({ conferenceId: 'c' }).success).toBe(true);
		expect(assignmentWeightsArgsSchema.safeParse({ nullRating: null, markBonus: 3 }).success).toBe(
			true
		);
	});

	// A field's `validate` hands the resolver what the schema returns
	it('keeps the arguments it does not check', () => {
		expect(assignmentWeightsArgsSchema.parse({ conferenceId: 'c', markBonus: 3 })).toEqual({
			conferenceId: 'c',
			markBonus: 3
		});
	});

	it('refuses a weight out of range', () => {
		expect(assignmentWeightsArgsSchema.safeParse({ nullRating: 1e300 }).success).toBe(false);
		expect(assignmentWeightsArgsSchema.safeParse({ ratingFactor: -1 }).success).toBe(false);
	});

	it('hands the resolver the arguments it does not check', () => {
		expect(assignmentWeightsArgsSchema.parse({ conferenceId: 'c' })).toMatchObject({
			conferenceId: 'c'
		});
	});
});
