import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, assignmentCost } from './weights';

describe('assignmentCost', () => {
	it('costs a wish its rank', () => {
		expect(assignmentCost({ weights: DEFAULT_WEIGHTS, review: undefined, wishRank: 1 })).toBe(1);
	});

	it('squares the rank so a far pick costs more than several near ones', () => {
		expect(assignmentCost({ weights: DEFAULT_WEIGHTS, review: undefined, wishRank: 3 })).toBe(9);
		expect(
			assignmentCost({ weights: DEFAULT_WEIGHTS, review: undefined, wishRank: 3 })
		).toBeGreaterThan(
			2 * assignmentCost({ weights: DEFAULT_WEIGHTS, review: undefined, wishRank: 2 })
		);
	});

	it('lets a good rating weigh the wish more', () => {
		const rated = (evaluation: number) => ({ evaluation, flagged: false, disqualified: false });
		const weights = DEFAULT_WEIGHTS;
		expect(
			assignmentCost({ weights, review: rated(5), wishRank: 4 }) -
				assignmentCost({ weights, review: rated(5), wishRank: 1 })
		).toBeGreaterThan(
			assignmentCost({ weights, review: rated(1), wishRank: 4 }) -
				assignmentCost({ weights, review: rated(1), wishRank: 1 })
		);
	});

	it('makes good ratings and flags cheaper', () => {
		const review = { evaluation: 5, flagged: true, disqualified: false };
		expect(
			assignmentCost({
				weights: { ...DEFAULT_WEIGHTS, markBonus: 1, ratingFactor: 0 },
				review,
				wishRank: 2
			})
		).toBe(3);
		expect(assignmentCost({ weights: DEFAULT_WEIGHTS, review, wishRank: 1 })).toBeLessThan(
			assignmentCost({
				weights: DEFAULT_WEIGHTS,
				review: { ...review, evaluation: 1 },
				wishRank: 1
			})
		);
	});
});
