import { describe, expect, it } from 'vitest';
import { distributeToOptions } from './surveyDistribution';

const people = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const countPer = (plan: { optionId: string }[]) =>
	Object.fromEntries(
		[...new Set(plan.map((p) => p.optionId))].map((id) => [
			id,
			plan.filter((p) => p.optionId === id).length
		])
	);

describe('distributeToOptions', () => {
	it('fills the options evenly relative to their limits', () => {
		const plan = distributeToOptions({
			participantIds: people(6),
			options: [
				{ id: 'a', upperLimit: 10, taken: 0 },
				{ id: 'b', upperLimit: 20, taken: 0 }
			]
		});
		expect(countPer(plan)).toEqual({ a: 2, b: 4 });
	});

	it('takes the answers an option already holds into account', () => {
		const plan = distributeToOptions({
			participantIds: people(4),
			options: [
				{ id: 'a', upperLimit: 10, taken: 4 },
				{ id: 'b', upperLimit: 10, taken: 0 }
			]
		});
		expect(countPer(plan)).toEqual({ b: 4 });
	});

	it('never fills an option past its limit and leaves the rest without one', () => {
		const plan = distributeToOptions({
			participantIds: people(5),
			options: [
				{ id: 'a', upperLimit: 2, taken: 1 },
				{ id: 'b', upperLimit: 3, taken: 1 }
			]
		});
		expect(plan).toHaveLength(3);
		expect(countPer(plan)).toEqual({ a: 1, b: 2 });
	});

	it('skips full options and treats an option without a limit as always open', () => {
		const plan = distributeToOptions({
			participantIds: people(3),
			options: [
				{ id: 'full', upperLimit: 2, taken: 2 },
				{ id: 'open', upperLimit: 0, taken: 50 }
			]
		});
		expect(countPer(plan)).toEqual({ open: 3 });
	});

	it('balances options without a limit by how many answers they hold', () => {
		const plan = distributeToOptions({
			participantIds: people(4),
			options: [
				{ id: 'a', upperLimit: 0, taken: 2 },
				{ id: 'b', upperLimit: 0, taken: 0 }
			]
		});
		expect(countPer(plan)).toEqual({ a: 1, b: 3 });
	});

	it('assigns nobody when there are no options', () => {
		expect(distributeToOptions({ participantIds: people(2), options: [] })).toEqual([]);
	});
});
