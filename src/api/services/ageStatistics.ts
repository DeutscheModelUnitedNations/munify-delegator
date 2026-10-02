import { db } from '$api/db/db';
import { getAgeAtConference } from '$lib/helpers/ageChecker';
import type {
	DelegationFilter,
	SingleParticipantFilter,
	StatsFilterType
} from './statisticsFilters';

export interface AgeOverall {
	average: number | null;
	total: number;
	missingBirthdays: number;
}

export interface AgeCategoryBreakdown {
	categoryId: string;
	count: number;
}

export interface AgeDistributionEntry {
	age: number;
	count: number;
	byCategory: AgeCategoryBreakdown[];
}

export interface AgeCategoryStats {
	categoryId: string;
	categoryName: string;
	categoryType: 'delegationMember' | 'singleParticipant';
	count: number;
	average: number | null;
}

export interface AgeCommitteeStats {
	committeeId: string;
	committeeName: string;
	abbreviation: string;
	count: number;
	average: number | null;
}

export interface AgeStatisticsResult {
	overall: AgeOverall;
	distribution: AgeDistributionEntry[];
	byCategory: AgeCategoryStats[];
	byCommittee: AgeCommitteeStats[];
}

function average(values: number[]) {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** The `applied` condition a filter puts on a delegation or single participant. */
function appliedCondition(filter: StatsFilterType) {
	switch (filter) {
		case 'APPLIED':
		case 'APPLIED_WITH_ROLE':
		case 'APPLIED_WITHOUT_ROLE':
			return { applied: true };
		case 'NOT_APPLIED':
			return { applied: false };
		case 'ALL':
			return {};
	}
}

/** A row whose user's birthday may or may not be known. */
interface WithBirthday {
	user: { birthday: Date | null };
}

/**
 * Accumulates the ages of every category as the categories are fetched, along with the counts of
 * participants with and without a known birthday.
 */
class AgeCollector {
	readonly categories: AgeCategoryStats[] = [];
	readonly ageData: { age: number; categoryId: string }[] = [];
	totalWithBirthday = 0;
	totalWithoutBirthday = 0;

	constructor(private readonly referenceDate: Date) {}

	ageOf(row: WithBirthday) {
		const birthday = row.user.birthday;
		if (!birthday) return undefined;
		return getAgeAtConference(birthday, this.referenceDate);
	}

	/** Books both halves of one category fetch: those with a birthday and those without. */
	count<T>(withBirthday: T[], withoutBirthday: unknown[]) {
		this.totalWithBirthday += withBirthday.length;
		this.totalWithoutBirthday += withoutBirthday.length;
		return withBirthday;
	}

	/** Adds a category, unless none of its rows has a usable age. */
	addCategory(category: Omit<AgeCategoryStats, 'count' | 'average'>, rows: WithBirthday[]) {
		const ages: number[] = [];
		for (const row of rows) {
			const age = this.ageOf(row);
			if (age === undefined) continue;
			ages.push(age);
			this.ageData.push({ age, categoryId: category.categoryId });
		}
		if (ages.length === 0) return;
		this.categories.push({ ...category, count: ages.length, average: average(ages) });
	}

	/** The distribution always spans at least 10 to 30 so the chart keeps a stable x axis. */
	distribution() {
		const allAges = this.ageData.map((entry) => entry.age);
		const minAge = Math.min(10, ...allAges);
		const maxAge = Math.max(30, ...allAges);
		const distribution: AgeDistributionEntry[] = [];

		for (let age = minAge; age <= maxAge; age++) {
			const entries = this.ageData.filter((entry) => entry.age === age);
			if (entries.length === 0) continue;

			const categoryIds = [...new Set(entries.map((entry) => entry.categoryId))];
			distribution.push({
				age,
				count: entries.length,
				byCategory: categoryIds.map((categoryId) => ({
					categoryId,
					count: entries.filter((entry) => entry.categoryId === categoryId).length
				}))
			});
		}
		return distribution;
	}

	overall(): AgeOverall {
		const allAges = this.ageData.map((entry) => entry.age);
		return {
			average: allAges.length > 0 ? average(allAges) : null,
			total: this.totalWithBirthday,
			missingBirthdays: this.totalWithoutBirthday
		};
	}
}

/** Per-committee ages of nation delegates, in the order the committees first appear. */
function committeeBreakdown(
	collector: AgeCollector,
	members: (WithBirthday & {
		assignedCommittee: { id: string; name: string; abbreviation: string } | null;
	})[]
): AgeCommitteeStats[] {
	const committeeAges = new Map<string, { name: string; abbreviation: string; ages: number[] }>();

	for (const member of members) {
		const age = collector.ageOf(member);
		const committee = member.assignedCommittee;
		if (age === undefined || !committee) continue;
		const existing = committeeAges.get(committee.id);
		if (existing) {
			existing.ages.push(age);
		} else {
			committeeAges.set(committee.id, {
				name: committee.name,
				abbreviation: committee.abbreviation,
				ages: [age]
			});
		}
	}

	return [...committeeAges].map(([committeeId, data]) => ({
		committeeId,
		committeeName: data.name,
		abbreviation: data.abbreviation,
		count: data.ages.length,
		average: average(data.ages)
	}));
}

/**
 * Age breakdown of a conference's participants, split into the categories the dashboard shows:
 * nation delegates (further split by committee), non-state actor participants, delegation members
 * without an assignment, and single participants per role.
 *
 * Participants without a birthday are counted separately rather than dropped silently, so the
 * dashboard can show how complete the data is.
 */
export async function getAgeStatistics({
	conferenceId,
	filter,
	referenceDate
}: {
	conferenceId: string;
	filter: StatsFilterType;
	referenceDate: Date;
}): Promise<AgeStatisticsResult> {
	const collector = new AgeCollector(referenceDate);
	let committeeStats: AgeCommitteeStats[] = [];

	/** Both halves of one category: the members whose age is known and those whose is not. */
	async function fetchDelegationMembers(delegation: DelegationFilter) {
		const [withBirthday, withoutBirthday] = await Promise.all([
			db.query.delegationMember.findMany({
				where: { conferenceId, delegation, user: { birthday: { isNotNull: true } } },
				columns: { id: true },
				with: {
					user: { columns: { birthday: true } },
					assignedCommittee: { columns: { id: true, name: true, abbreviation: true } }
				}
			}),
			db.query.delegationMember.findMany({
				where: { conferenceId, delegation, user: { birthday: { isNull: true } } },
				columns: { id: true }
			})
		]);
		return collector.count(withBirthday, withoutBirthday);
	}

	/** The same two-sided fetch for single participants. */
	async function fetchSingleParticipants(where: SingleParticipantFilter) {
		const [withBirthday, withoutBirthday] = await Promise.all([
			db.query.singleParticipant.findMany({
				where: { ...where, user: { birthday: { isNotNull: true } } },
				columns: { id: true },
				with: { user: { columns: { birthday: true } } }
			}),
			db.query.singleParticipant.findMany({
				where: { ...where, user: { birthday: { isNull: true } } },
				columns: { id: true }
			})
		]);
		return collector.count(withBirthday, withoutBirthday);
	}

	const applied = appliedCondition(filter);

	if (filter !== 'APPLIED_WITHOUT_ROLE') {
		// Nation delegates. Their committee assignment also feeds the per-committee breakdown.
		const nationDelegates = await fetchDelegationMembers({
			assignedNationAlpha3Code: { isNotNull: true },
			...applied
		});
		collector.addCategory(
			{
				categoryId: 'nationDelegates',
				categoryName: 'Nation Delegates',
				categoryType: 'delegationMember'
			},
			nationDelegates
		);
		committeeStats = committeeBreakdown(collector, nationDelegates);

		// Non-state actor participants. Delegations with a nation are excluded to avoid counting
		// the same member twice.
		collector.addCategory(
			{
				categoryId: 'nsaParticipants',
				categoryName: 'NSA Participants',
				categoryType: 'delegationMember'
			},
			await fetchDelegationMembers({
				assignedNonStateActorId: { isNotNull: true },
				assignedNationAlpha3Code: { isNull: true },
				...applied
			})
		);
	}

	// Delegation members whose delegation has no assignment at all. Role-based filters have
	// nothing to say about them, so they only show up for the other three.
	if (filter === 'ALL' || filter === 'APPLIED' || filter === 'NOT_APPLIED') {
		collector.addCategory(
			{
				categoryId: 'unassignedDelegationMembers',
				categoryName: 'Unassigned Delegation Members',
				categoryType: 'delegationMember'
			},
			await fetchDelegationMembers({
				assignedNationAlpha3Code: { isNull: true },
				assignedNonStateActorId: { isNull: true },
				...applied
			})
		);
	}

	// Single participants, one category per conference role.
	if (filter !== 'APPLIED_WITHOUT_ROLE') {
		const roles = await db.query.customConferenceRole.findMany({
			where: { conferenceId },
			columns: { id: true, name: true }
		});

		for (const role of roles) {
			collector.addCategory(
				{
					categoryId: `role_${role.id}`,
					categoryName: role.name,
					categoryType: 'singleParticipant'
				},
				await fetchSingleParticipants({ conferenceId, ...applied, assignedRoleId: role.id })
			);
		}
	}

	// Single participants without a role. Meaningless when the filter asks for role holders.
	if (filter !== 'APPLIED_WITH_ROLE') {
		collector.addCategory(
			{ categoryId: 'unassigned', categoryName: 'Unassigned', categoryType: 'singleParticipant' },
			await fetchSingleParticipants({
				conferenceId,
				...applied,
				assignedRoleId: { isNull: true }
			})
		);
	}

	return {
		overall: collector.overall(),
		distribution: collector.distribution(),
		byCategory: collector.categories,
		byCommittee: committeeStats
	};
}
