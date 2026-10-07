import type * as schema from '$api/db/schema';
import { type StatsFilterType, matchesStatsFilter } from './statisticsFilters';

/**
 * The statistics dashboard reads materialized views (the `statistics_materialized_views`
 * migration documents each one) rather than the live tables: the figures are aggregations over
 * every registration of a conference, which is far too much work to repeat per request. The
 * views are grouped by the filter dimensions, so every function here sums a few pre-aggregated
 * rows. `statisticsData.ts` loads them and keeps them refreshed.
 *
 * Not every block honours the filter: registration totals, the supervisor breakdown, postal and
 * payment progress, committee seats, the waiting list and the paper statistics always describe
 * the whole conference, because they are about its operational state rather than about a subset
 * of registrations.
 */

type PeopleRow = (typeof schema.statisticsPeople)['$inferSelect'];
type DelegationsRow = (typeof schema.statisticsDelegations)['$inferSelect'];
type RegistrationDayRow = (typeof schema.statisticsRegistrationDays)['$inferSelect'];
type RoleApplicationsRow = (typeof schema.statisticsRoleApplications)['$inferSelect'];
type AgesRow = (typeof schema.statisticsAges)['$inferSelect'];
type AddressesRow = (typeof schema.statisticsAddresses)['$inferSelect'];
type ParticipantStatusRow = (typeof schema.statisticsParticipantStatus)['$inferSelect'];
type CommitteeFillRow = (typeof schema.statisticsCommitteeFill)['$inferSelect'];
type WaitingListRow = (typeof schema.statisticsWaitingList)['$inferSelect'];
type PapersRow = (typeof schema.statisticsPapers)['$inferSelect'];

/** The summed `count` of the rows the predicate selects. */
function sumWhere<R extends { count: number }>(rows: R[], predicate: (row: R) => boolean) {
	return rows.reduce((sum, row) => (predicate(row) ? sum + row.count : sum), 0);
}

function percentage(part: number, whole: number) {
	return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Adds `count` to the entry under `key`, creating it with `create` on first sight. */
function accumulate<K, V>(map: Map<K, V>, key: K, create: () => V) {
	const existing = map.get(key);
	if (existing) return existing;
	const entry = create();
	map.set(key, entry);
	return entry;
}

// ── Countdowns ──────────────────────────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function countdownsOf(
	conference: { startConference: Date; startAssignment: Date },
	now = new Date()
) {
	return {
		daysUntilConference: Math.floor(
			(conference.startConference.getTime() - now.getTime()) / MS_PER_DAY
		),
		daysUntilEndRegistration: Math.floor(
			(conference.startAssignment.getTime() - now.getTime()) / MS_PER_DAY
		)
	};
}

// ── Registration totals (unfiltered, but for the supervisor count) ─────────

function appliedSplit(total: number, applied: number) {
	return { total, applied, notApplied: total - applied };
}

export function registrationStatisticsOf(
	people: PeopleRow[],
	delegations: DelegationsRow[],
	roleApplications: RoleApplicationsRow[],
	filter: StatsFilterType
) {
	const ofKind = (kind: PeopleRow['kind'], predicate: (row: PeopleRow) => boolean = () => true) =>
		sumWhere(people, (row) => row.kind === kind && predicate(row));
	const isApplied = (row: { applied: boolean }) => row.applied;

	const delegationsTotal = delegations.reduce((sum, row) => sum + row.delegations, 0);
	const delegationsApplied = delegations.reduce(
		(sum, row) => (row.applied ? sum + row.delegations : sum),
		0
	);
	const delegationMembers = appliedSplit(
		ofKind('DELEGATION_MEMBER'),
		ofKind('DELEGATION_MEMBER', isApplied)
	);
	const singleParticipants = appliedSplit(
		ofKind('SINGLE_PARTICIPANT'),
		ofKind('SINGLE_PARTICIPANT', isApplied)
	);

	return {
		...appliedSplit(
			delegationMembers.total + singleParticipants.total,
			delegationMembers.applied + singleParticipants.applied
		),
		delegations: appliedSplit(delegationsTotal, delegationsApplied),
		delegationMembers,
		singleParticipants: {
			...singleParticipants,
			byRole: roleApplications
				.toSorted((a, b) => a.name.localeCompare(b.name))
				.map((role) => ({
					role: role.name,
					fontAwesomeIcon: role.fontAwesomeIcon ?? undefined,
					...appliedSplit(role.total, role.applied)
				}))
		},
		supervisors: ofKind('SUPERVISOR', (row) => matchesStatsFilter(filter, row))
	};
}

// ── Supervisors (unfiltered) ────────────────────────────────────────────────

/** "Accepted" means at least one of their participants got a role. */
export function supervisorStatsOf(people: PeopleRow[]) {
	const supervisors = people.filter((row) => row.kind === 'SUPERVISOR');
	const count = (predicate: (row: PeopleRow) => boolean) => sumWhere(supervisors, predicate);

	return {
		total: count(() => true),
		accepted: count((row) => row.accepted),
		rejected: count((row) => !row.accepted),
		plansAttendance: count((row) => row.attends),
		doesNotPlanAttendance: count((row) => !row.attends),
		acceptedAndPresent: count((row) => row.accepted && row.attends),
		acceptedAndNotPresent: count((row) => row.accepted && !row.attends),
		rejectedAndPresent: count((row) => !row.accepted && row.attends),
		rejectedAndNotPresent: count((row) => !row.accepted && !row.attends)
	};
}

// ── Diet and gender (filtered; supervisors only when they attend) ───────────

/** The people of each column of the diet and gender matrices. */
function matrixGroups(people: PeopleRow[], filter: StatsFilterType) {
	const of = (kind: PeopleRow['kind'], predicate: (row: PeopleRow) => boolean) =>
		people.filter((row) => row.kind === kind && predicate(row));
	const filtered = (row: PeopleRow) => matchesStatsFilter(filter, row);

	return {
		singleParticipants: of('SINGLE_PARTICIPANT', filtered),
		delegationMembers: of('DELEGATION_MEMBER', filtered),
		supervisors: of('SUPERVISOR', (row) => row.attends && filtered(row)),
		teamMembers: of('TEAM_MEMBER', () => true)
	};
}

function mapGroups<T>(groups: ReturnType<typeof matrixGroups>, of: (rows: PeopleRow[]) => T) {
	return {
		singleParticipants: of(groups.singleParticipants),
		delegationMembers: of(groups.delegationMembers),
		supervisors: of(groups.supervisors),
		teamMembers: of(groups.teamMembers)
	};
}

export function dietOf(people: PeopleRow[], filter: StatsFilterType) {
	return mapGroups(matrixGroups(people, filter), (rows) => ({
		omnivore: sumWhere(rows, (row) => row.foodPreference === 'OMNIVORE'),
		vegetarian: sumWhere(rows, (row) => row.foodPreference === 'VEGETARIAN'),
		vegan: sumWhere(rows, (row) => row.foodPreference === 'VEGAN')
	}));
}

export function genderOf(people: PeopleRow[], filter: StatsFilterType) {
	return mapGroups(matrixGroups(people, filter), (rows) => ({
		male: sumWhere(rows, (row) => row.gender === 'MALE'),
		female: sumWhere(rows, (row) => row.gender === 'FEMALE'),
		diverse: sumWhere(rows, (row) => row.gender === 'DIVERSE'),
		noStatement: sumWhere(rows, (row) => row.gender === 'NO_STATEMENT')
	}));
}

// ── Role assignment breakdown (filtered) ────────────────────────────────────

export function roleBasedOf(
	people: PeopleRow[],
	delegations: DelegationsRow[],
	filter: StatsFilterType
) {
	// A filter that already selects one side of the split makes the other side meaningless, so
	// it stays at zero rather than showing a number the filter contradicts.
	const showWithRole = filter !== 'NOT_APPLIED' && filter !== 'APPLIED_WITHOUT_ROLE';
	const showWithoutRole = filter !== 'NOT_APPLIED' && filter !== 'APPLIED_WITH_ROLE';

	const side = (withRole: boolean) => {
		const shown = withRole ? showWithRole : showWithoutRole;
		const selected = (row: { applied: boolean; hasRole: boolean }) =>
			shown && row.hasRole === withRole && matchesStatsFilter(filter, row);
		return {
			members: sumWhere(people, (row) => row.kind === 'DELEGATION_MEMBER' && selected(row)),
			singles: sumWhere(people, (row) => row.kind === 'SINGLE_PARTICIPANT' && selected(row)),
			delegations: delegations.reduce(
				(sum, row) => (selected(row) ? sum + row.delegations : sum),
				0
			)
		};
	};
	const withRole = side(true);
	const withoutRole = side(false);

	// Committee seats only exist for nations, so non-state actors are left out here.
	const committeeSeated = (hasCommittee: boolean) =>
		sumWhere(
			people,
			(row) =>
				row.kind === 'DELEGATION_MEMBER' &&
				row.applied &&
				row.hasNation &&
				row.hasCommittee === hasCommittee
		);

	return {
		delegationMembersWithRole: withRole.members,
		delegationMembersWithoutRole: withoutRole.members,
		delegationMembersWithCommittee: committeeSeated(true),
		delegationMembersWithoutCommittee: committeeSeated(false),
		singleParticipantsWithRole: withRole.singles,
		singleParticipantsWithoutRole: withoutRole.singles,
		delegationsWithAssignment: withRole.delegations,
		delegationsWithoutAssignment: withoutRole.delegations
	};
}

// ── Ages (filtered) ─────────────────────────────────────────────────────────

const AGE_CATEGORY_NAMES: Record<string, string> = {
	nationDelegates: 'Nation Delegates',
	nsaParticipants: 'NSA Participants',
	unassignedDelegationMembers: 'Unassigned Delegation Members',
	unassigned: 'Unassigned'
};

/** Delegation categories first, then the roles by name, then single participants without one. */
function ageCategoryRank(categoryId: string) {
	const fixed = ['nationDelegates', 'nsaParticipants', 'unassignedDelegationMembers'];
	if (fixed.includes(categoryId)) return fixed.indexOf(categoryId);
	return categoryId === 'unassigned' ? fixed.length + 1 : fixed.length;
}

type AgeGroup = { count: number; ageSum: number };

const averageOf = (group: AgeGroup) => (group.count > 0 ? group.ageSum / group.count : null);

/**
 * Age breakdown of a conference's participants, at the end of the conference: overall, per
 * category (nation delegates, non-state actor delegates, unassigned delegation members, single
 * participants per role and without one), per committee of the nation delegates, and per age.
 * Participants without a birthday are counted separately rather than dropped silently, so the
 * dashboard can show how complete the data is.
 */
export function ageStatisticsOf(ages: AgesRow[], filter: StatsFilterType) {
	const rows = ages.filter((row) => matchesStatsFilter(filter, row));
	const known = rows.filter((row): row is AgesRow & { age: number } => row.age !== null);
	const newGroup = (): AgeGroup => ({ count: 0, ageSum: 0 });
	const add = (group: AgeGroup, row: { age: number; count: number }) => {
		group.count += row.count;
		group.ageSum += row.age * row.count;
	};

	const overall = newGroup();
	const categories = new Map<string, AgeGroup & { name: string; type: AgesRow['categoryType'] }>();
	const committees = new Map<string, AgeGroup & { name: string; abbreviation: string }>();
	const byAge = new Map<number, Map<string, number>>();

	for (const row of known) {
		add(overall, row);
		add(
			accumulate(categories, row.categoryId, () => ({
				...newGroup(),
				name: row.roleName ?? AGE_CATEGORY_NAMES[row.categoryId] ?? row.categoryId,
				type: row.categoryType
			})),
			row
		);
		if (row.committeeId) {
			add(
				accumulate(committees, row.committeeId, () => ({
					...newGroup(),
					name: row.committeeName ?? '',
					abbreviation: row.committeeAbbreviation ?? ''
				})),
				row
			);
		}
		const atAge = accumulate(byAge, row.age, () => new Map<string, number>());
		atAge.set(row.categoryId, (atAge.get(row.categoryId) ?? 0) + row.count);
	}

	return {
		overall: {
			average: averageOf(overall),
			total: overall.count,
			missingBirthdays: sumWhere(rows, (row) => row.age === null)
		},
		distribution: [...byAge]
			.toSorted(([a], [b]) => a - b)
			.map(([age, byCategory]) => ({
				age,
				count: [...byCategory.values()].reduce((sum, count) => sum + count, 0),
				byCategory: [...byCategory].map(([categoryId, count]) => ({ categoryId, count }))
			})),
		byCategory: [...categories]
			.toSorted(
				([a, x], [b, y]) => ageCategoryRank(a) - ageCategoryRank(b) || x.name.localeCompare(y.name)
			)
			.map(([categoryId, group]) => ({
				categoryId,
				categoryName: group.name,
				categoryType: group.type,
				count: group.count,
				average: averageOf(group)
			})),
		byCommittee: [...committees]
			.toSorted(([, x], [, y]) => x.name.localeCompare(y.name))
			.map(([committeeId, group]) => ({
				committeeId,
				committeeName: group.name,
				abbreviation: group.abbreviation,
				count: group.count,
				average: averageOf(group)
			}))
	};
}

// ── Postal and payment status (unfiltered) ──────────────────────────────────

/** Which of postal and payment are complete; neither is not counted, it is the remainder. */
function completionBucket(postal: boolean, payment: boolean) {
	if (postal && payment) return 'bothComplete';
	if (postal) return 'postalOnlyComplete';
	if (payment) return 'paymentOnlyComplete';
	return undefined;
}

function postalBucket(row: ParticipantStatusRow) {
	if (row.postalDone) return 'postalDone';
	return row.postalProblem ? 'postalProblem' : 'postalPending';
}

function paymentBucket(row: ParticipantStatusRow) {
	if (row.paymentStatus === 'DONE') return 'paymentDone';
	return row.paymentStatus === 'PROBLEM' ? 'paymentProblem' : 'paymentPending';
}

/**
 * Only participants who actually got a seat (and supervisors who attend) are expected to complete
 * postal and payment, so the progress counts them; the plain status counts every status row.
 */
export function participantStatusOf(statuses: ParticipantStatusRow[]) {
	const withStatus = statuses.filter((row) => row.hasStatus);
	const status = {
		paymentStatus: {
			done: sumWhere(withStatus, (row) => row.paymentStatus === 'DONE'),
			problem: sumWhere(withStatus, (row) => row.paymentStatus === 'PROBLEM')
		},
		postalStatus: {
			done: sumWhere(withStatus, (row) => row.postalDone),
			problem: sumWhere(withStatus, (row) => row.postalProblem)
		},
		didAttend: sumWhere(statuses, (row) => row.didAttend)
	};

	const maxParticipants = sumWhere(statuses, (row) => row.expected);
	const counts = {
		postalDone: 0,
		postalPending: 0,
		postalProblem: 0,
		paymentDone: 0,
		paymentPending: 0,
		paymentProblem: 0,
		bothComplete: 0,
		postalOnlyComplete: 0,
		paymentOnlyComplete: 0
	};
	for (const row of withStatus) {
		if (!row.expected) continue;
		counts[postalBucket(row)] += row.count;
		counts[paymentBucket(row)] += row.count;
		const completion = completionBucket(row.postalDone, row.paymentStatus === 'DONE');
		if (completion) counts[completion] += row.count;
	}

	return {
		status,
		postalPaymentProgress: {
			maxParticipants,
			...counts,
			postalPercentage: percentage(counts.postalDone, maxParticipants),
			paymentPercentage: percentage(counts.paymentDone, maxParticipants),
			// Participants with no status row at all fall in here too.
			neitherComplete:
				maxParticipants -
				counts.bothComplete -
				counts.postalOnlyComplete -
				counts.paymentOnlyComplete
		}
	};
}

// ── Addresses and nationalities (filtered) ──────────────────────────────────

export function addressesOf(addresses: AddressesRow[], filter: StatsFilterType) {
	const groups = new Map<
		string,
		{ country: string | null; zipPrefix: string | null; count: number }
	>();
	for (const row of addresses) {
		if (!matchesStatsFilter(filter, row)) continue;
		const group = accumulate(groups, `${row.country ?? ''}:${row.zipPrefix ?? ''}`, () => ({
			country: row.country,
			zipPrefix: row.zipPrefix,
			count: 0
		}));
		group.count += row.count;
	}

	return [...groups.values()].map(({ country, zipPrefix, count }) => ({
		country,
		zipPrefix,
		_count: {
			_all: count,
			zipPrefix: zipPrefix === null ? 0 : count,
			country: country === null ? 0 : count
		}
	}));
}

export function nationalityDistributionOf(addresses: AddressesRow[], filter: StatsFilterType) {
	const counts = new Map<string, number>();
	for (const row of addresses) {
		if (row.country === null || !matchesStatsFilter(filter, row)) continue;
		counts.set(row.country, (counts.get(row.country) ?? 0) + row.count);
	}
	return [...counts].map(([country, count]) => ({ country, countryCode: country, count }));
}

// ── Committee fill rates (unfiltered, applied delegations only) ─────────────

export function committeeFillRatesOf(committees: CommitteeFillRow[]) {
	return committees
		.toSorted((a, b) => a.name.localeCompare(b.name))
		.map((committee) => ({
			committeeId: committee.committeeId,
			name: committee.name,
			abbreviation: committee.abbreviation,
			totalSeats: committee.totalSeats,
			assignedSeats: committee.assignedSeats,
			fillPercentage: percentage(committee.assignedSeats, committee.totalSeats)
		}));
}

// ── Registration timeline and schools (filtered) ────────────────────────────

const DAY_COUNTERS = {
	DELEGATION: 'cumulativeDelegations',
	SINGLE_PARTICIPANT: 'cumulativeSingleParticipants',
	SUPERVISOR: 'cumulativeSupervisors'
} as const;

/** Running totals per day; days without registrations are filled in so the x axis stays linear. */
export function registrationTimelineOf(days: RegistrationDayRow[], filter: StatsFilterType) {
	const matching = days.filter((row) => matchesStatsFilter(filter, row));
	if (matching.length === 0) return [];

	const sorted = matching.toSorted((a, b) => a.day.localeCompare(b.day));
	const totals = {
		cumulativeDelegations: 0,
		cumulativeDelegationMembers: 0,
		cumulativeSingleParticipants: 0,
		cumulativeSupervisors: 0
	};
	const timeline: ({ date: string } & typeof totals)[] = [];

	const cursor = new Date(`${sorted[0].day}T00:00:00Z`);
	const end = new Date(`${sorted[sorted.length - 1].day}T00:00:00Z`);
	let next = 0;
	while (cursor <= end) {
		const date = cursor.toISOString().slice(0, 10);
		for (; next < sorted.length && sorted[next].day === date; next++) {
			totals[DAY_COUNTERS[sorted[next].kind]] += sorted[next].registrations;
			totals.cumulativeDelegationMembers += sorted[next].members;
		}
		timeline.push({ date, ...totals });
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return timeline;
}

export function schoolStatsOf(delegations: DelegationsRow[], filter: StatsFilterType) {
	const schools = new Map<string, { delegationCount: number; memberCount: number }>();
	for (const row of delegations) {
		if (!matchesStatsFilter(filter, row)) continue;
		const school = accumulate(schools, row.school || 'Unknown', () => ({
			delegationCount: 0,
			memberCount: 0
		}));
		school.delegationCount += row.delegations;
		school.memberCount += row.members;
	}
	return [...schools]
		.map(([school, data]) => ({ school, ...data }))
		.toSorted((a, b) => b.memberCount - a.memberCount);
}

// ── Waiting list (unfiltered) ───────────────────────────────────────────────

export function waitingListOf(entries: WaitingListRow[]) {
	const total = sumWhere(entries, () => true);
	const visible = sumWhere(entries, (row) => !row.hidden);
	const assigned = sumWhere(entries, (row) => row.assigned);
	return { total, visible, hidden: total - visible, assigned, unassigned: total - assigned };
}

// ── Papers (unfiltered) ─────────────────────────────────────────────────────

export function paperStatsOf(papers: PapersRow[]) {
	const count = (predicate: (row: PapersRow) => boolean) => sumWhere(papers, predicate);
	const total = count(() => true);
	const withReviews = count((row) => row.hasReview);

	const committees = new Map<string, { name: string; abbreviation: string; count: number }>();
	for (const row of papers) {
		if (!row.committeeId) continue;
		accumulate(committees, row.committeeId, () => ({
			name: row.committeeName ?? '',
			abbreviation: row.committeeAbbreviation ?? '',
			count: 0
		})).count += row.count;
	}

	return {
		total,
		byType: {
			positionPaper: count((row) => row.type === 'POSITION_PAPER'),
			workingPaper: count((row) => row.type === 'WORKING_PAPER'),
			introductionPaper: count((row) => row.type === 'INTRODUCTION_PAPER')
		},
		byStatus: {
			draft: count((row) => row.status === 'DRAFT'),
			submitted: count((row) => row.status === 'SUBMITTED'),
			changesRequested: count((row) => row.status === 'CHANGES_REQUESTED'),
			accepted: count((row) => row.status === 'ACCEPTED')
		},
		withReviews,
		withoutReviews: total - withReviews,
		byCommittee: [...committees].map(([committeeId, data]) => ({ committeeId, ...data }))
	};
}
