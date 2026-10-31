import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { filteredStatValue } from '../statsFilterValue';
import {
	acceptanceChartData,
	acceptedOf,
	ageChartSeries,
	distributionChartData,
	getCategoryColor,
	getCategoryDisplayName,
	rejectedOf
} from './chartData';

const roleBased = {
	delegationMembersWithRole: 3,
	delegationMembersWithoutRole: 1,
	singleParticipantsWithRole: 2,
	singleParticipantsWithoutRole: 4
};

describe('getCategoryColor', () => {
	test('uses fixed colors for known categories and cycles role colors by index', () => {
		expect(getCategoryColor({ categoryId: 'nationDelegates', index: 5 })).toBe('#3b82f6');
		expect(getCategoryColor({ categoryId: 'nsaParticipants', index: 0 })).toBe('#8b5cf6');
		expect(getCategoryColor({ categoryId: 'unassignedDelegationMembers', index: 0 })).toBe(
			'#6b7280'
		);
		expect(getCategoryColor({ categoryId: 'role-1', index: 0 })).toBe('#10b981');
		expect(getCategoryColor({ categoryId: 'role-7', index: 7 })).toBe(
			getCategoryColor({ categoryId: 'role-1', index: 1 })
		);
	});
});

describe('getCategoryDisplayName', () => {
	test('translates fixed categories and keeps role names', () => {
		expect(getCategoryDisplayName({ categoryId: 'nationDelegates', categoryName: 'x' })).toBe(
			m.statsNationDelegates()
		);
		expect(getCategoryDisplayName({ categoryId: 'nsaParticipants', categoryName: 'x' })).toBe(
			m.statsNSAParticipants()
		);
		expect(
			getCategoryDisplayName({ categoryId: 'unassignedDelegationMembers', categoryName: 'x' })
		).toBe(m.statsUnassignedDelegationMembers());
		expect(getCategoryDisplayName({ categoryId: 'unassigned', categoryName: 'x' })).toBe(
			m.statsUnassigned()
		);
		expect(getCategoryDisplayName({ categoryId: 'role-1', categoryName: 'Press' })).toBe('Press');
	});
});

describe('ageChartSeries', () => {
	test('is empty without a distribution', () => {
		expect(ageChartSeries(undefined)).toEqual([]);
		expect(ageChartSeries({ distribution: null, byCategory: [] })).toEqual([]);
		expect(ageChartSeries({ distribution: [], byCategory: [] })).toEqual([]);
	});

	test('builds one series per category with role colors by role index', () => {
		const series = ageChartSeries({
			distribution: [
				{ byCategory: [{ categoryId: 'nationDelegates', count: 2 }] },
				{
					byCategory: [
						{ categoryId: 'nationDelegates', count: 1 },
						{ categoryId: 'r2', count: 4 }
					]
				}
			],
			byCategory: [
				{ categoryId: 'nationDelegates', categoryName: 'n', categoryType: 'delegationMember' },
				{ categoryId: 'r1', categoryName: 'Press', categoryType: 'singleParticipant' },
				{ categoryId: 'r2', categoryName: 'Judge', categoryType: 'singleParticipant' }
			]
		});
		expect(series).toEqual([
			{ name: m.statsNationDelegates(), data: [2, 1], color: '#3b82f6' },
			{ name: 'Press', data: [0, 0], color: '#10b981' },
			{ name: 'Judge', data: [0, 4], color: '#f59e0b' }
		]);
	});

	test('has no series without categories', () => {
		expect(ageChartSeries({ distribution: [{ byCategory: [] }] })).toEqual([]);
	});
});

describe('acceptedOf / rejectedOf', () => {
	test('sum both entity types', () => {
		expect(acceptedOf(roleBased)).toBe(5);
		expect(rejectedOf(roleBased)).toBe(5);
	});
});

describe('acceptanceChartData', () => {
	test('needs registrations and role counts', () => {
		expect(acceptanceChartData(undefined)).toEqual([]);
		expect(acceptanceChartData({ registered: { notApplied: 1 }, roleBased: null })).toEqual([]);
		expect(acceptanceChartData({ registered: null, roleBased })).toEqual([]);
	});

	test('shows accepted, rejected and not applied', () => {
		expect(
			acceptanceChartData({ registered: { notApplied: 7 }, roleBased }).map((d) => d.value)
		).toEqual([5, 5, 7]);
	});
});

describe('distributionChartData', () => {
	const registered = {
		delegationMembers: { total: 10, applied: 6, notApplied: 4 },
		singleParticipants: { total: 3, applied: 2, notApplied: 1 },
		supervisors: 2
	};

	test('needs registrations', () => {
		expect(distributionChartData({ stats: undefined, filteredValue: () => 1 })).toEqual([]);
		expect(distributionChartData({ stats: { registered: null }, filteredValue: () => 1 })).toEqual(
			[]
		);
	});

	test('counts each group under the filter', () => {
		const applied = distributionChartData({
			stats: { registered, roleBased },
			filteredValue: ({ object, roleBasedData, entityType }) =>
				filteredStatValue({ filter: 'applied', object, roleBasedData, entityType })
		});
		expect(applied.map((d) => d.value)).toEqual([6, 2, 2]);
		const withRole = distributionChartData({
			stats: { registered, roleBased },
			filteredValue: ({ object, roleBasedData, entityType }) =>
				filteredStatValue({
					filter: 'appliedWithRole',
					object,
					roleBasedData,
					entityType
				})
		});
		expect(withRole.map((d) => d.value)).toEqual([3, 2, 2]);
	});

	test('counts a missing value as zero', () => {
		const result = distributionChartData({
			stats: { registered, roleBased: null },
			filteredValue: ({ object, roleBasedData, entityType }) =>
				filteredStatValue({
					filter: 'appliedWithRole',
					object,
					roleBasedData,
					entityType
				})
		});
		expect(result.map((d) => d.value)).toEqual([0, 0, 2]);
	});
});
