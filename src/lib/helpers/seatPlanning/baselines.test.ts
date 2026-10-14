import { describe, expect, test } from 'vitest';
import {
	baselineTemplates,
	balancingSeats,
	baselineWeights,
	canGainSeat,
	canGiveUpSeat,
	isValidManualTargets,
	proportionalTargets,
	regionalDeviations,
	transferRecommendation
} from './baselines';
import type { UnMember } from './unMembers';

const member = (alpha3Code: string, regionalGroup: UnMember['regionalGroup']): UnMember => ({
	alpha3Code,
	alpha2Code: alpha3Code.slice(0, 2),
	regionalGroup,
	region: '',
	subregion: '',
	capital: [],
	languages: [],
	borders: [],
	landlocked: false
});

const members = [
	member('af1', 'African Group'),
	member('af2', 'African Group'),
	member('af3', 'African Group'),
	member('ap1', 'Asia and the Pacific Group'),
	member('ee1', 'Eastern European Group'),
	member('la1', 'Latin American and Caribbean Group'),
	member('we1', 'Western European and Others Group'),
	member('we2', 'Western European and Others Group')
];

describe('baseline templates', () => {
	test('match the official allocations', () => {
		const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
		expect(sum(baselineTemplates.UN_MEMBERS)).toBe(193);
		expect(sum(baselineTemplates.HUMAN_RIGHTS_COUNCIL)).toBe(47);
		expect(sum(baselineTemplates.ECOSOC)).toBe(54);
		expect(sum(baselineTemplates.SECURITY_COUNCIL)).toBe(15);
	});
});

describe('manual targets', () => {
	test('need one non-negative whole number per group, not all 0', () => {
		expect(isValidManualTargets([3, 3, 2, 3, 4])).toBe(true);
		expect(isValidManualTargets([0, 0, 0, 0, 1])).toBe(true);
		expect(isValidManualTargets([0, 0, 0, 0, 0])).toBe(false);
		expect(isValidManualTargets([3, 3, 2, 3])).toBe(false);
		expect(isValidManualTargets([3, 3, -2, 3, 4])).toBe(false);
		expect(isValidManualTargets([3, 3, 2.5, 3, 4])).toBe(false);
	});

	test('fall back to the UN members when unusable', () => {
		expect(baselineWeights('MANUAL', [3, 3, 2, 3, 4])).toEqual([3, 3, 2, 3, 4]);
		expect(baselineWeights('MANUAL', [])).toEqual(baselineTemplates.UN_MEMBERS);
		expect(baselineWeights('ECOSOC', [1, 1, 1, 1, 1])).toEqual(baselineTemplates.ECOSOC);
	});
});

describe('regionalDeviations', () => {
	test('measures seats against the committee baseline and suggests the smallest delegations', () => {
		const [result] = regionalDeviations(
			[
				{
					id: 'sr',
					numOfSeatsPerDelegation: 1,
					// 1 African, 0 Asia-Pacific, 1 Eastern European, 1 Latin American, 2 WEOG
					nations: ['af1', 'ee1', 'la1', 'we1', 'we2'],
					regionalBaseline: 'MANUAL',
					regionalBaselineTargets: [2, 1, 1, 0, 1]
				}
			],
			members,
			new Map([
				['af1', 1],
				['af2', 3],
				['af3', 1]
			])
		);

		expect(result.seats).toBe(5);
		expect(result.groups.map((g) => g.deviation)).toEqual([-1, -1, 0, 1, 1]);
		expect(result.seatsToMove).toBe(2);
		expect(result.mostMissing?.group).toBe('African Group');
		expect(result.suggestions).toEqual(['af3', 'af2']);
	});

	test('counts seats per delegation and is balanced when it matches the baseline', () => {
		const [result] = regionalDeviations(
			[
				{
					id: 'sr',
					numOfSeatsPerDelegation: 2,
					nations: ['af1', 'we1'],
					regionalBaseline: 'MANUAL',
					regionalBaselineTargets: [1, 0, 0, 0, 1]
				}
			],
			members,
			new Map()
		);
		expect(result.seats).toBe(4);
		expect(result.groups[0]).toMatchObject({ actual: 2, target: 2, deviation: 0 });
		expect(result.seatsToMove).toBe(0);
		expect(result.mostMissing).toBeUndefined();
		expect(result.suggestions).toEqual([]);
	});
});

describe('balancing never aims for one-person delegations', () => {
	test('only existing delegations gain a seat', () => {
		expect(canGainSeat(0)).toBe(false);
		expect(canGainSeat(1)).toBe(true);
		expect(canGainSeat(4)).toBe(true);
	});

	test('a seat is only taken where at least two remain', () => {
		expect(canGiveUpSeat(1, 1)).toBe(false);
		expect(canGiveUpSeat(2, 1)).toBe(false);
		expect(canGiveUpSeat(3, 1)).toBe(true);
		expect(canGiveUpSeat(3, 2)).toBe(false);
		expect(canGiveUpSeat(4, 2)).toBe(true);
	});

	test('filters the suggested states of a committee', () => {
		const [result] = regionalDeviations(
			[
				{
					id: 'gv',
					numOfSeatsPerDelegation: 1,
					// WEOG holds every seat, Africa none
					nations: ['we1', 'we2'],
					regionalBaseline: 'MANUAL',
					regionalBaselineTargets: [1, 0, 0, 0, 0]
				}
			],
			members,
			new Map([
				['we1', 2],
				['we2', 3],
				['af1', 1]
			])
		);
		expect(result.recommendation?.from.group).toBe('Western European and Others Group');
		// we1 would be left alone
		expect(result.removals).toEqual(['we2']);
		// af2 and af3 have no delegation yet
		expect(result.suggestions).toEqual(['af1']);
	});
});

describe('proportionalTargets', () => {
	const un = baselineTemplates.UN_MEMBERS;
	const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

	test('always adds up to the committee size', () => {
		for (const seats of [1, 2, 7, 15, 30, 97]) {
			const targets = proportionalTargets(un, seats);
			expect(sum(targets)).toBe(seats);
			expect(isValidManualTargets(targets)).toBe(true);
		}
	});

	test('gives the remaining seats to the largest remainders', () => {
		expect(proportionalTargets(un, 15)).toEqual([4, 4, 2, 3, 2]);
		expect(proportionalTargets(un, 1)).toEqual([1, 0, 0, 0, 0]);
	});

	test('falls back to the weights for an empty committee', () => {
		expect(proportionalTargets(un, 0)).toEqual(un);
	});
});

describe('transferRecommendation', () => {
	const group = (deviation: number, name = 'African Group' as const) => ({
		group: name,
		actual: 0,
		target: 0,
		deviation
	});

	test('moves seats from the most over- to the most under-represented group', () => {
		const groups = [
			{ ...group(-5.1), group: 'African Group' as const },
			{ ...group(-1.1), group: 'Asia and the Pacific Group' as const },
			{ ...group(-0.6), group: 'Eastern European Group' as const },
			{ ...group(-1.6), group: 'Latin American and Caribbean Group' as const },
			{ ...group(8.4), group: 'Western European and Others Group' as const }
		];
		const recommendation = transferRecommendation(groups, 1);
		expect(recommendation?.from.group).toBe('Western European and Others Group');
		expect(recommendation?.to.group).toBe('African Group');
		expect(recommendation?.seats).toBe(5);
		// WEOG +3.4 left: 2 seats to Latin America, 1 to Asia-Pacific, then nothing improves
		expect(recommendation?.seatsToMoveAfter).toBe(3);
		expect(balancingSeats(groups, 1)).toBe(8);
	});

	test('moves whole delegations only', () => {
		const groups = [
			{ ...group(-3), group: 'African Group' as const },
			{ ...group(3), group: 'Western European and Others Group' as const }
		];
		expect(transferRecommendation(groups, 2)?.seats).toBe(4);
		expect(transferRecommendation(groups, 4)?.seats).toBe(4);
		expect(transferRecommendation(groups, 8)).toBeUndefined();
	});

	test('recommends nothing for a balanced committee', () => {
		const groups = [
			{ ...group(-0.4), group: 'African Group' as const },
			{ ...group(0.4), group: 'Western European and Others Group' as const }
		];
		expect(transferRecommendation(groups, 1)).toBeUndefined();
	});

	test('is balanced when no transfer brings it noticeably closer to its baseline', () => {
		// a 96 seat General Assembly: moving a WEOG seat to Eastern Europe would swap +0.58 / -0.44
		// for -0.42 / +0.56, only 0.04 seats better
		const balanced = [
			{ ...group(0.14), group: 'African Group' as const },
			{ ...group(0.14), group: 'Asia and the Pacific Group' as const },
			{ ...group(-0.44), group: 'Eastern European Group' as const },
			{ ...group(-0.42), group: 'Latin American and Caribbean Group' as const },
			{ ...group(0.58), group: 'Western European and Others Group' as const }
		];
		expect(transferRecommendation(balanced, 1)).toBeUndefined();
		expect(balancingSeats(balanced, 1)).toBe(0);
	});

	test('recommends a single seat when it helps, even below one seat each', () => {
		const groups = [
			{ ...group(-0.4), group: 'African Group' as const },
			{ ...group(0.9), group: 'Western European and Others Group' as const },
			{ ...group(-0.5), group: 'Eastern European Group' as const }
		];
		// 1.8 seats off before, 1.0 after
		expect(transferRecommendation(groups, 1)).toMatchObject({ seats: 1, seatsToMoveAfter: 0 });
	});
});
