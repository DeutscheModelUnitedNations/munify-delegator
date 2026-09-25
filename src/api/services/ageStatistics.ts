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
	const categories: AgeCategoryStats[] = [];
	const committeeStats: AgeCommitteeStats[] = [];
	const ageData: { age: number; categoryId: string }[] = [];

	let totalWithBirthday = 0;
	let totalWithoutBirthday = 0;

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

		totalWithBirthday += withBirthday.length;
		totalWithoutBirthday += withoutBirthday.length;
		return withBirthday;
	}

	const applied = appliedCondition(filter);

	// Nation delegates. Their committee assignment also feeds the per-committee breakdown.
	if (filter !== 'APPLIED_WITHOUT_ROLE') {
		const members = await fetchDelegationMembers({
			assignedNationAlpha3Code: { isNotNull: true },
			...applied
		});

		const committeeAges = new Map<string, { name: string; abbreviation: string; ages: number[] }>();
		const ages: number[] = [];

		for (const member of members) {
			const birthday = member.user.birthday;
			if (!birthday) continue;
			const age = getAgeAtConference(birthday, referenceDate);
			if (age === undefined) continue;
			ages.push(age);
			ageData.push({ age, categoryId: 'nationDelegates' });

			const committee = member.assignedCommittee;
			if (!committee) continue;
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

		if (ages.length > 0) {
			categories.push({
				categoryId: 'nationDelegates',
				categoryName: 'Nation Delegates',
				categoryType: 'delegationMember',
				count: ages.length,
				average: average(ages)
			});
		}

		for (const [committeeId, data] of committeeAges) {
			committeeStats.push({
				committeeId,
				committeeName: data.name,
				abbreviation: data.abbreviation,
				count: data.ages.length,
				average: average(data.ages)
			});
		}
	}

	// Non-state actor participants. Delegations with a nation are excluded to avoid counting
	// the same member twice.
	if (filter !== 'APPLIED_WITHOUT_ROLE') {
		const members = await fetchDelegationMembers({
			assignedNonStateActorId: { isNotNull: true },
			assignedNationAlpha3Code: { isNull: true },
			...applied
		});

		const ages: number[] = [];
		for (const member of members) {
			const birthday = member.user.birthday;
			if (!birthday) continue;
			const age = getAgeAtConference(birthday, referenceDate);
			if (age === undefined) continue;
			ages.push(age);
			ageData.push({ age, categoryId: 'nsaParticipants' });
		}

		if (ages.length > 0) {
			categories.push({
				categoryId: 'nsaParticipants',
				categoryName: 'NSA Participants',
				categoryType: 'delegationMember',
				count: ages.length,
				average: average(ages)
			});
		}
	}

	// Delegation members whose delegation has no assignment at all. Role-based filters have
	// nothing to say about them, so they only show up for the other three.
	if (filter === 'ALL' || filter === 'APPLIED' || filter === 'NOT_APPLIED') {
		const members = await fetchDelegationMembers({
			assignedNationAlpha3Code: { isNull: true },
			assignedNonStateActorId: { isNull: true },
			...applied
		});

		const ages: number[] = [];
		for (const member of members) {
			const birthday = member.user.birthday;
			if (!birthday) continue;
			const age = getAgeAtConference(birthday, referenceDate);
			if (age === undefined) continue;
			ages.push(age);
			ageData.push({ age, categoryId: 'unassignedDelegationMembers' });
		}

		if (ages.length > 0) {
			categories.push({
				categoryId: 'unassignedDelegationMembers',
				categoryName: 'Unassigned Delegation Members',
				categoryType: 'delegationMember',
				count: ages.length,
				average: average(ages)
			});
		}
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

		totalWithBirthday += withBirthday.length;
		totalWithoutBirthday += withoutBirthday.length;
		return withBirthday;
	}

	const singleParticipantBase = {
		conferenceId,
		...applied,
		...(filter === 'APPLIED_WITH_ROLE' ? { assignedRoleId: { isNotNull: true } } : {}),
		...(filter === 'APPLIED_WITHOUT_ROLE' ? { assignedRoleId: { isNull: true } } : {})
	};

	// Single participants, one category per conference role.
	if (filter !== 'APPLIED_WITHOUT_ROLE') {
		const roles = await db.query.customConferenceRole.findMany({
			where: { conferenceId },
			columns: { id: true, name: true }
		});

		for (const role of roles) {
			const participants = await fetchSingleParticipants({
				...singleParticipantBase,
				assignedRoleId: role.id
			});

			const ages: number[] = [];
			for (const participant of participants) {
				const birthday = participant.user.birthday;
				if (!birthday) continue;
				const age = getAgeAtConference(birthday, referenceDate);
				if (age === undefined) continue;
				ages.push(age);
				ageData.push({ age, categoryId: `role_${role.id}` });
			}

			if (ages.length > 0) {
				categories.push({
					categoryId: `role_${role.id}`,
					categoryName: role.name,
					categoryType: 'singleParticipant',
					count: ages.length,
					average: average(ages)
				});
			}
		}
	}

	// Single participants without a role. Meaningless when the filter asks for role holders.
	if (filter !== 'APPLIED_WITH_ROLE') {
		const participants = await fetchSingleParticipants({
			conferenceId,
			assignedRoleId: { isNull: true },
			...(filter === 'APPLIED' || filter === 'APPLIED_WITHOUT_ROLE' ? { applied: true } : {}),
			...(filter === 'NOT_APPLIED' ? { applied: false } : {})
		});

		const ages: number[] = [];
		for (const participant of participants) {
			const birthday = participant.user.birthday;
			if (!birthday) continue;
			const age = getAgeAtConference(birthday, referenceDate);
			if (age === undefined) continue;
			ages.push(age);
			ageData.push({ age, categoryId: 'unassigned' });
		}

		if (ages.length > 0) {
			categories.push({
				categoryId: 'unassigned',
				categoryName: 'Unassigned',
				categoryType: 'singleParticipant',
				count: ages.length,
				average: average(ages)
			});
		}
	}

	// The distribution always spans at least 10 to 30 so the chart keeps a stable x axis.
	const allAges = ageData.map((entry) => entry.age);
	const minAge = Math.min(10, ...allAges);
	const maxAge = Math.max(30, ...allAges);
	const distribution: AgeDistributionEntry[] = [];

	for (let age = minAge; age <= maxAge; age++) {
		const entries = ageData.filter((entry) => entry.age === age);
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

	return {
		overall: {
			average: allAges.length > 0 ? average(allAges) : null,
			total: totalWithBirthday,
			missingBirthdays: totalWithoutBirthday
		},
		distribution,
		byCategory: categories,
		byCommittee: committeeStats
	};
}
