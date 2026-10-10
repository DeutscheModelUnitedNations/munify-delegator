import { describe, expect, test } from 'vitest';
import {
	addressesOf,
	ageStatisticsOf,
	dietOf,
	nationalityDistributionOf,
	participantStatusOf,
	registrationStatisticsOf,
	registrationTimelineOf,
	roleBasedOf,
	supervisorStatsOf
} from './statistics';
import { matchesStatsFilter } from './statisticsFilters';

type PeopleRow = Parameters<typeof supervisorStatsOf>[0][number];
type DelegationsRow = Parameters<typeof roleBasedOf>[1][number];
type AgesRow = Parameters<typeof ageStatisticsOf>[0][number];
type StatusRow = Parameters<typeof participantStatusOf>[0][number];

const person = (overrides: Partial<PeopleRow>): PeopleRow => ({
	conferenceId: 'c',
	kind: 'DELEGATION_MEMBER',
	applied: false,
	hasRole: false,
	hasNation: false,
	hasCommittee: false,
	accepted: false,
	attends: true,
	gender: null,
	foodPreference: null,
	count: 1,
	...overrides
});

const delegations = (overrides: Partial<DelegationsRow>): DelegationsRow => ({
	conferenceId: 'c',
	applied: false,
	hasRole: false,
	school: null,
	delegations: 1,
	members: 1,
	...overrides
});

describe('matchesStatsFilter', () => {
	const rows = {
		notApplied: { applied: false, hasRole: false },
		applied: { applied: true, hasRole: false },
		withRole: { applied: true, hasRole: true }
	};

	test('selects by applied and role', () => {
		const selected = (filter: Parameters<typeof matchesStatsFilter>[0]) =>
			Object.entries(rows)
				.filter(([, row]) => matchesStatsFilter(filter, row))
				.map(([name]) => name);

		expect(selected('ALL')).toEqual(['notApplied', 'applied', 'withRole']);
		expect(selected('APPLIED')).toEqual(['applied', 'withRole']);
		expect(selected('NOT_APPLIED')).toEqual(['notApplied']);
		expect(selected('APPLIED_WITH_ROLE')).toEqual(['withRole']);
		expect(selected('APPLIED_WITHOUT_ROLE')).toEqual(['applied']);
	});
});

describe('registrationStatisticsOf', () => {
	test('totals ignore the filter, the supervisor count follows it', () => {
		const people = [
			person({ kind: 'DELEGATION_MEMBER', applied: true, count: 5 }),
			person({ kind: 'DELEGATION_MEMBER', applied: false, count: 2 }),
			person({ kind: 'SINGLE_PARTICIPANT', applied: true, count: 3 }),
			person({ kind: 'SUPERVISOR', applied: true, count: 4 }),
			person({ kind: 'SUPERVISOR', applied: false, count: 1 }),
			person({ kind: 'TEAM_MEMBER', count: 9 })
		];
		const stats = registrationStatisticsOf(
			people,
			[delegations({ applied: true, delegations: 2 }), delegations({ delegations: 1 })],
			[
				{
					conferenceId: 'c',
					roleId: 'r2',
					name: 'Presse',
					fontAwesomeIcon: null,
					total: 2,
					applied: 1
				},
				{
					conferenceId: 'c',
					roleId: 'r1',
					name: 'Gericht',
					fontAwesomeIcon: 'gavel',
					total: 0,
					applied: 0
				}
			],
			'APPLIED'
		);

		expect(stats).toMatchObject({
			total: 10,
			applied: 8,
			notApplied: 2,
			delegations: { total: 3, applied: 2, notApplied: 1 },
			delegationMembers: { total: 7, applied: 5, notApplied: 2 },
			singleParticipants: { total: 3, applied: 3, notApplied: 0 },
			supervisors: 4
		});
		expect(stats.singleParticipants.byRole).toEqual([
			{ role: 'Gericht', fontAwesomeIcon: 'gavel', total: 0, applied: 0, notApplied: 0 },
			{ role: 'Presse', fontAwesomeIcon: undefined, total: 2, applied: 1, notApplied: 1 }
		]);
	});
});

describe('supervisors', () => {
	const supervisors = [
		person({ kind: 'SUPERVISOR', accepted: true, attends: true, foodPreference: 'VEGAN' }),
		person({ kind: 'SUPERVISOR', accepted: true, attends: false, foodPreference: 'VEGAN' }),
		person({ kind: 'SUPERVISOR', accepted: false, attends: true, count: 2 })
	];

	test('are split by acceptance and attendance', () => {
		expect(supervisorStatsOf(supervisors)).toEqual({
			total: 4,
			accepted: 2,
			rejected: 2,
			plansAttendance: 3,
			doesNotPlanAttendance: 1,
			acceptedAndPresent: 1,
			acceptedAndNotPresent: 1,
			rejectedAndPresent: 2,
			rejectedAndNotPresent: 0
		});
	});

	test('only count towards the diet when they attend', () => {
		expect(dietOf(supervisors, 'ALL').supervisors).toEqual({
			omnivore: 0,
			vegetarian: 0,
			vegan: 1
		});
	});
});

describe('roleBasedOf', () => {
	const people = [
		person({ applied: true, hasRole: true, hasNation: true, hasCommittee: true, count: 3 }),
		person({ applied: true, hasRole: true, hasNation: true, count: 1 }),
		person({ applied: true, hasRole: false, count: 2 }),
		person({ kind: 'SINGLE_PARTICIPANT', applied: true, hasRole: true, count: 4 })
	];
	const rows = [
		delegations({ applied: true, hasRole: true, delegations: 2 }),
		delegations({ applied: true, delegations: 1 })
	];

	test('splits members, single participants and delegations by role', () => {
		expect(roleBasedOf(people, rows, 'ALL')).toEqual({
			delegationMembersWithRole: 4,
			delegationMembersWithoutRole: 2,
			delegationMembersWithCommittee: 3,
			delegationMembersWithoutCommittee: 1,
			singleParticipantsWithRole: 4,
			singleParticipantsWithoutRole: 0,
			delegationsWithAssignment: 2,
			delegationsWithoutAssignment: 1
		});
	});

	test('leaves the side a filter excludes at zero', () => {
		const stats = roleBasedOf(people, rows, 'APPLIED_WITH_ROLE');
		expect(stats.delegationMembersWithoutRole).toBe(0);
		expect(stats.delegationsWithoutAssignment).toBe(0);
		expect(stats.delegationMembersWithRole).toBe(4);
	});
});

describe('ageStatisticsOf', () => {
	const age = (overrides: Partial<AgesRow>): AgesRow => ({
		conferenceId: 'c',
		categoryId: 'nationDelegates',
		categoryType: 'delegationMember',
		roleName: null,
		committeeId: null,
		committeeName: null,
		committeeAbbreviation: null,
		applied: true,
		hasRole: true,
		age: 16,
		count: 1,
		...overrides
	});
	const rows = [
		age({ committeeId: 'gv', committeeName: 'GV', committeeAbbreviation: 'GV', age: 16, count: 3 }),
		age({ committeeId: 'gv', committeeName: 'GV', committeeAbbreviation: 'GV', age: 18, count: 1 }),
		age({ categoryId: 'unassigned', categoryType: 'singleParticipant', hasRole: false, age: 20 }),
		age({
			categoryId: 'role_x',
			categoryType: 'singleParticipant',
			roleName: 'Presse',
			age: 17,
			count: 2
		}),
		age({ age: null, count: 5 })
	];

	test('weights every age by its head count', () => {
		const stats = ageStatisticsOf(rows, 'ALL');

		expect(stats.overall).toEqual({
			average: (16 * 3 + 18 + 20 + 17 * 2) / 7,
			total: 7,
			missingBirthdays: 5
		});
		expect(stats.byCommittee).toEqual([
			{ committeeId: 'gv', committeeName: 'GV', abbreviation: 'GV', count: 4, average: 16.5 }
		]);
		expect(stats.distribution.map(({ age, count }) => [age, count])).toEqual([
			[16, 3],
			[17, 2],
			[18, 1],
			[20, 1]
		]);
	});

	test('orders delegation categories before roles before single participants without one', () => {
		expect(ageStatisticsOf(rows, 'ALL').byCategory.map((c) => c.categoryName)).toEqual([
			'Nation Delegates',
			'Presse',
			'Unassigned'
		]);
	});

	test('applies the filter', () => {
		const stats = ageStatisticsOf(rows, 'APPLIED_WITHOUT_ROLE');
		expect(stats.overall).toEqual({ average: 20, total: 1, missingBirthdays: 0 });
	});
});

describe('participantStatusOf', () => {
	const status = (overrides: Partial<StatusRow>): StatusRow => ({
		conferenceId: 'c',
		expected: true,
		hasStatus: true,
		paymentStatus: 'PENDING',
		postalDone: false,
		postalProblem: false,
		didAttend: false,
		count: 1,
		...overrides
	});

	test('measures progress against everyone expected, with or without a status row', () => {
		const { status: counts, postalPaymentProgress } = participantStatusOf([
			status({ paymentStatus: 'DONE', postalDone: true, count: 2 }),
			status({ paymentStatus: 'DONE' }),
			status({ postalProblem: true }),
			status({ hasStatus: false, paymentStatus: null, count: 4 }),
			status({ expected: false, paymentStatus: 'DONE', didAttend: true })
		]);

		expect(counts).toEqual({
			paymentStatus: { done: 4, problem: 0 },
			postalStatus: { done: 2, problem: 1 },
			didAttend: 1
		});
		expect(postalPaymentProgress).toEqual({
			maxParticipants: 8,
			postalDone: 2,
			postalPending: 1,
			postalProblem: 1,
			postalPercentage: 25,
			paymentDone: 3,
			paymentPending: 1,
			paymentProblem: 0,
			paymentPercentage: 38,
			bothComplete: 2,
			postalOnlyComplete: 0,
			paymentOnlyComplete: 1,
			neitherComplete: 5
		});
	});
});

describe('registrationTimelineOf', () => {
	test('accumulates per day and fills the days in between', () => {
		const day = (
			date: string,
			kind: 'DELEGATION' | 'SINGLE_PARTICIPANT' | 'SUPERVISOR',
			registrations: number,
			members = 0
		) => ({
			conferenceId: 'c',
			day: date,
			kind,
			applied: true,
			hasRole: false,
			registrations,
			members
		});

		expect(
			registrationTimelineOf(
				[
					day('2026-03-30', 'SUPERVISOR', 1),
					day('2026-03-28', 'DELEGATION', 2, 7),
					day('2026-03-28', 'SINGLE_PARTICIPANT', 1)
				],
				'ALL'
			)
		).toEqual([
			{
				date: '2026-03-28',
				cumulativeDelegations: 2,
				cumulativeDelegationMembers: 7,
				cumulativeSingleParticipants: 1,
				cumulativeSupervisors: 0
			},
			{
				date: '2026-03-29',
				cumulativeDelegations: 2,
				cumulativeDelegationMembers: 7,
				cumulativeSingleParticipants: 1,
				cumulativeSupervisors: 0
			},
			{
				date: '2026-03-30',
				cumulativeDelegations: 2,
				cumulativeDelegationMembers: 7,
				cumulativeSingleParticipants: 1,
				cumulativeSupervisors: 1
			}
		]);
	});
});

describe('addressesOf', () => {
	test('merges the filter dimensions of one address', () => {
		const address = (applied: boolean, zipPrefix: string | null, count: number) => ({
			conferenceId: 'c',
			applied,
			hasRole: false,
			country: 'DEU',
			zipPrefix,
			count
		});

		expect(
			addressesOf(
				[address(true, '241', 2), address(false, '241', 1), address(true, null, 4)],
				'ALL'
			)
		).toEqual([
			{ country: 'DEU', zipPrefix: '241', _count: { _all: 3, zipPrefix: 3, country: 3 } },
			{ country: 'DEU', zipPrefix: null, _count: { _all: 4, zipPrefix: 0, country: 4 } }
		]);
	});
});

describe('nationalityDistributionOf', () => {
	const address = (applied: boolean, country: string | null, count: number) => ({
		conferenceId: 'c',
		applied,
		hasRole: false,
		country,
		zipPrefix: null,
		count
	});

	test('sums the counts per country and skips addresses without one', () => {
		expect(
			nationalityDistributionOf(
				[
					address(true, 'DEU', 2),
					address(false, 'DEU', 1),
					address(true, 'AUT', 4),
					address(true, null, 5)
				],
				'ALL'
			)
		).toEqual([
			{ country: 'DEU', countryCode: 'DEU', count: 3 },
			{ country: 'AUT', countryCode: 'AUT', count: 4 }
		]);
	});

	test('leaves out addresses the filter excludes', () => {
		expect(
			nationalityDistributionOf(
				[address(true, 'DEU', 2), address(false, 'DEU', 1), address(false, 'AUT', 4)],
				'APPLIED'
			)
		).toEqual([{ country: 'DEU', countryCode: 'DEU', count: 2 }]);
	});
});
