import type { PrismaClient } from '@prisma/client';
import { getAgeAtConference } from '$lib/services/ageChecker';

// Filter type (imported from stats.ts in actual usage)
export type StatsFilterType =
	| 'ALL'
	| 'APPLIED'
	| 'NOT_APPLIED'
	| 'APPLIED_WITH_ROLE'
	| 'APPLIED_WITHOUT_ROLE';

// Output types
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

// Check if filter should include nation delegates
function shouldIncludeNationDelegates(filter: StatsFilterType): boolean {
	return filter !== 'APPLIED_WITHOUT_ROLE';
}

// Check if filter should include NSA participants
function shouldIncludeNsaParticipants(filter: StatsFilterType): boolean {
	return filter !== 'APPLIED_WITHOUT_ROLE';
}

// Check if filter should include single participants (with or without roles)
function shouldIncludeSingleParticipants(filter: StatsFilterType): boolean {
	return true; // All filters include single participants (with different conditions)
}

export async function getAgeStatistics({
	db,
	conferenceId,
	filter,
	referenceDate
}: {
	db: PrismaClient;
	conferenceId: string;
	filter: StatsFilterType;
	referenceDate: Date;
}): Promise<AgeStatisticsResult> {
	const categories: AgeCategoryStats[] = [];
	const committeeStats: AgeCommitteeStats[] = [];
	const ageData: { age: number; categoryId: string }[] = [];

	// Track missing birthdays count
	let totalWithBirthday = 0;
	let totalWithoutBirthday = 0;

	// ============================================================
	// 1. NATION DELEGATES (delegation members with nation assignment)
	// ============================================================
	if (shouldIncludeNationDelegates(filter)) {
		const nationDelegateWhere = {
			conferenceId,
			delegation: {
				assignedNationAlpha3Code: { not: null },
				...(filter === 'APPLIED' || filter === 'APPLIED_WITH_ROLE'
					? { applied: true }
					: filter === 'NOT_APPLIED'
						? { applied: false }
						: {})
			}
		};

		// Count with birthday
		const nationDelegatesWithBirthday = await db.delegationMember.findMany({
			where: {
				...nationDelegateWhere,
				user: { birthday: { not: null } }
			},
			select: {
				user: { select: { birthday: true } },
				assignedCommittee: { select: { id: true, name: true, abbreviation: true } }
			}
		});

		// Count without birthday (for tracking)
		const nationDelegatesWithoutBirthday = await db.delegationMember.count({
			where: {
				...nationDelegateWhere,
				user: { birthday: null }
			}
		});

		totalWithBirthday += nationDelegatesWithBirthday.length;
		totalWithoutBirthday += nationDelegatesWithoutBirthday;

		// Process ages and build committee stats
		const committeeAgeMap = new Map<
			string,
			{ name: string; abbreviation: string; ages: number[] }
		>();
		const nationDelegateAges: number[] = [];

		for (const dm of nationDelegatesWithBirthday) {
			const age = getAgeAtConference(dm.user.birthday!, referenceDate);
			if (age === undefined) continue;
			nationDelegateAges.push(age);
			ageData.push({ age, categoryId: 'nationDelegates' });

			// Track committee stats
			if (dm.assignedCommittee) {
				const existing = committeeAgeMap.get(dm.assignedCommittee.id);
				if (existing) {
					existing.ages.push(age);
				} else {
					committeeAgeMap.set(dm.assignedCommittee.id, {
						name: dm.assignedCommittee.name,
						abbreviation: dm.assignedCommittee.abbreviation,
						ages: [age]
					});
				}
			}
		}

		// Add nation delegates category
		if (nationDelegateAges.length > 0) {
			categories.push({
				categoryId: 'nationDelegates',
				categoryName: 'Nation Delegates',
				categoryType: 'delegationMember',
				count: nationDelegateAges.length,
				average: nationDelegateAges.reduce((a, b) => a + b, 0) / nationDelegateAges.length
			});
		}

		// Add committee stats
		for (const [committeeId, data] of committeeAgeMap) {
			committeeStats.push({
				committeeId,
				committeeName: data.name,
				abbreviation: data.abbreviation,
				count: data.ages.length,
				average: data.ages.reduce((a, b) => a + b, 0) / data.ages.length
			});
		}
	}

	// ============================================================
	// 2. NSA PARTICIPANTS (delegation members with NSA assignment)
	// ============================================================
	if (shouldIncludeNsaParticipants(filter)) {
		const nsaParticipantWhere = {
			conferenceId,
			delegation: {
				assignedNonStateActorId: { not: null },
				// Exclude those with nation code (to avoid double counting)
				assignedNationAlpha3Code: null,
				...(filter === 'APPLIED' || filter === 'APPLIED_WITH_ROLE'
					? { applied: true }
					: filter === 'NOT_APPLIED'
						? { applied: false }
						: {})
			}
		};

		// Count with birthday
		const nsaParticipantsWithBirthday = await db.delegationMember.findMany({
			where: {
				...nsaParticipantWhere,
				user: { birthday: { not: null } }
			},
			select: {
				user: { select: { birthday: true } }
			}
		});

		// Count without birthday
		const nsaParticipantsWithoutBirthday = await db.delegationMember.count({
			where: {
				...nsaParticipantWhere,
				user: { birthday: null }
			}
		});

		totalWithBirthday += nsaParticipantsWithBirthday.length;
		totalWithoutBirthday += nsaParticipantsWithoutBirthday;

		const nsaAges: number[] = [];
		for (const dm of nsaParticipantsWithBirthday) {
			const age = getAgeAtConference(dm.user.birthday!, referenceDate);
			if (age === undefined) continue;
			nsaAges.push(age);
			ageData.push({ age, categoryId: 'nsaParticipants' });
		}

		if (nsaAges.length > 0) {
			categories.push({
				categoryId: 'nsaParticipants',
				categoryName: 'NSA Participants',
				categoryType: 'delegationMember',
				count: nsaAges.length,
				average: nsaAges.reduce((a, b) => a + b, 0) / nsaAges.length
			});
		}
	}

	// ============================================================
	// 3. UNASSIGNED DELEGATION MEMBERS (no nation or NSA assignment)
	// ============================================================
	// Only include for ALL, APPLIED, NOT_APPLIED filters (not for role-based filters)
	if (filter === 'ALL' || filter === 'APPLIED' || filter === 'NOT_APPLIED') {
		const unassignedDmWhere = {
			conferenceId,
			delegation: {
				assignedNationAlpha3Code: null,
				assignedNonStateActorId: null,
				...(filter === 'APPLIED'
					? { applied: true }
					: filter === 'NOT_APPLIED'
						? { applied: false }
						: {})
			}
		};

		const unassignedDmsWithBirthday = await db.delegationMember.findMany({
			where: {
				...unassignedDmWhere,
				user: { birthday: { not: null } }
			},
			select: {
				user: { select: { birthday: true } }
			}
		});

		const unassignedDmsWithoutBirthday = await db.delegationMember.count({
			where: {
				...unassignedDmWhere,
				user: { birthday: null }
			}
		});

		totalWithBirthday += unassignedDmsWithBirthday.length;
		totalWithoutBirthday += unassignedDmsWithoutBirthday;

		const unassignedDmAges: number[] = [];
		for (const dm of unassignedDmsWithBirthday) {
			const age = getAgeAtConference(dm.user.birthday!, referenceDate);
			if (age === undefined) continue;
			unassignedDmAges.push(age);
			ageData.push({ age, categoryId: 'unassignedDelegationMembers' });
		}

		if (unassignedDmAges.length > 0) {
			categories.push({
				categoryId: 'unassignedDelegationMembers',
				categoryName: 'Unassigned Delegation Members',
				categoryType: 'delegationMember',
				count: unassignedDmAges.length,
				average: unassignedDmAges.reduce((a, b) => a + b, 0) / unassignedDmAges.length
			});
		}
	}

	// ============================================================
	// 4. SINGLE PARTICIPANTS (by role)
	// ============================================================
	if (shouldIncludeSingleParticipants(filter)) {
		// Build where clause based on filter
		const spBaseWhere = {
			conferenceId,
			...(filter === 'APPLIED' ? { applied: true } : {}),
			...(filter === 'NOT_APPLIED' ? { applied: false } : {}),
			...(filter === 'APPLIED_WITH_ROLE' ? { applied: true, assignedRoleId: { not: null } } : {}),
			...(filter === 'APPLIED_WITHOUT_ROLE' ? { applied: true, assignedRoleId: null } : {})
		};

		// Get all roles for this conference
		const roles = await db.customConferenceRole.findMany({
			where: { conferenceId },
			select: { id: true, name: true }
		});

		// For each role, get participants with birthdays
		for (const role of roles) {
			// Skip roles when filter is APPLIED_WITHOUT_ROLE
			if (filter === 'APPLIED_WITHOUT_ROLE') continue;

			const roleParticipantsWithBirthday = await db.singleParticipant.findMany({
				where: {
					...spBaseWhere,
					assignedRoleId: role.id,
					user: { birthday: { not: null } }
				},
				select: {
					user: { select: { birthday: true } }
				}
			});

			const roleParticipantsWithoutBirthday = await db.singleParticipant.count({
				where: {
					...spBaseWhere,
					assignedRoleId: role.id,
					user: { birthday: null }
				}
			});

			totalWithBirthday += roleParticipantsWithBirthday.length;
			totalWithoutBirthday += roleParticipantsWithoutBirthday;

			const roleAges: number[] = [];
			for (const sp of roleParticipantsWithBirthday) {
				const age = getAgeAtConference(sp.user.birthday!, referenceDate);
				if (age === undefined) continue;
				roleAges.push(age);
				ageData.push({ age, categoryId: `role_${role.id}` });
			}

			if (roleAges.length > 0) {
				categories.push({
					categoryId: `role_${role.id}`,
					categoryName: role.name,
					categoryType: 'singleParticipant',
					count: roleAges.length,
					average: roleAges.reduce((a, b) => a + b, 0) / roleAges.length
				});
			}
		}

		// Handle unassigned single participants (only for ALL, APPLIED, NOT_APPLIED, APPLIED_WITHOUT_ROLE)
		if (filter !== 'APPLIED_WITH_ROLE') {
			const unassignedWhere = {
				conferenceId,
				assignedRoleId: null,
				...(filter === 'APPLIED' || filter === 'APPLIED_WITHOUT_ROLE' ? { applied: true } : {}),
				...(filter === 'NOT_APPLIED' ? { applied: false } : {})
			};

			const unassignedWithBirthday = await db.singleParticipant.findMany({
				where: {
					...unassignedWhere,
					user: { birthday: { not: null } }
				},
				select: {
					user: { select: { birthday: true } }
				}
			});

			const unassignedWithoutBirthday = await db.singleParticipant.count({
				where: {
					...unassignedWhere,
					user: { birthday: null }
				}
			});

			totalWithBirthday += unassignedWithBirthday.length;
			totalWithoutBirthday += unassignedWithoutBirthday;

			const unassignedAges: number[] = [];
			for (const sp of unassignedWithBirthday) {
				const age = getAgeAtConference(sp.user.birthday!, referenceDate);
				if (age === undefined) continue;
				unassignedAges.push(age);
				ageData.push({ age, categoryId: 'unassigned' });
			}

			if (unassignedAges.length > 0) {
				categories.push({
					categoryId: 'unassigned',
					categoryName: 'Unassigned',
					categoryType: 'singleParticipant',
					count: unassignedAges.length,
					average: unassignedAges.reduce((a, b) => a + b, 0) / unassignedAges.length
				});
			}
		}
	}

	// ============================================================
	// Build distribution (ages 10-30)
	// ============================================================
	const distribution: AgeDistributionEntry[] = [];
	const allAges = ageData.map((d) => d.age);
	const minAge = Math.min(10, ...allAges);
	const maxAge = Math.max(30, ...allAges);

	for (let age = minAge; age <= maxAge; age++) {
		const ageEntries = ageData.filter((d) => d.age === age);
		if (ageEntries.length === 0) continue;

		// Group by category
		const byCategory: AgeCategoryBreakdown[] = [];
		const categoryIds = [...new Set(ageEntries.map((e) => e.categoryId))];
		for (const categoryId of categoryIds) {
			byCategory.push({
				categoryId,
				count: ageEntries.filter((e) => e.categoryId === categoryId).length
			});
		}

		distribution.push({
			age,
			count: ageEntries.length,
			byCategory
		});
	}

	// ============================================================
	// Calculate overall stats
	// ============================================================
	const overall: AgeOverall = {
		average: allAges.length > 0 ? allAges.reduce((a, b) => a + b, 0) / allAges.length : null,
		total: totalWithBirthday,
		missingBirthdays: totalWithoutBirthday
	};

	return {
		overall,
		distribution,
		byCategory: categories,
		byCommittee: committeeStats
	};
}
