import { db } from '$api/db/db';
import { assertFindFirstExists } from '@m1212e/rumble';
import { ofAgeAtConference } from '$lib/helpers/ageChecker';
import { getAgeStatistics } from './ageStatistics';
import {
	type DelegationFilter,
	type DelegationMemberFilter,
	type SingleParticipantFilter,
	type StatsFilterType,
	type UserFilter,
	delegationConditions,
	delegationMemberWhere,
	delegationWhere,
	singleParticipantWhere,
	userWhere
} from './statisticsFilters';

const zeroDiet = { omnivore: 0, vegetarian: 0, vegan: 0 };
const zeroGender = { male: 0, female: 0, diverse: 0, noStatement: 0 };

async function countUsers(where: UserFilter) {
	return (await db.query.user.findMany({ where, columns: { id: true } })).length;
}

async function countDelegationMembers(where: DelegationMemberFilter) {
	return (await db.query.delegationMember.findMany({ where, columns: { id: true } })).length;
}

async function countSingleParticipants(where: SingleParticipantFilter) {
	return (await db.query.singleParticipant.findMany({ where, columns: { id: true } })).length;
}

async function countDelegations(where: Parameters<typeof db.query.delegation.findMany>[0]) {
	return (await db.query.delegation.findMany(where)).length;
}

/** Diet breakdown of whichever set of users the given filter selects. */
async function dietOf(where: UserFilter) {
	const [omnivore, vegetarian, vegan] = await Promise.all([
		countUsers({ ...where, foodPreference: 'OMNIVORE' }),
		countUsers({ ...where, foodPreference: 'VEGETARIAN' }),
		countUsers({ ...where, foodPreference: 'VEGAN' })
	]);
	return { omnivore, vegetarian, vegan };
}

async function genderOf(where: UserFilter) {
	const [male, female, diverse, noStatement] = await Promise.all([
		countUsers({ ...where, gender: 'MALE' }),
		countUsers({ ...where, gender: 'FEMALE' }),
		countUsers({ ...where, gender: 'DIVERSE' }),
		countUsers({ ...where, gender: 'NO_STATEMENT' })
	]);
	return { male, female, diverse, noStatement };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function countdownsOf(conference: { startConference: Date; startAssignment: Date }) {
	const now = new Date();
	return {
		daysUntilConference: Math.floor(
			(conference.startConference.getTime() - now.getTime()) / MS_PER_DAY
		),
		daysUntilEndRegistration: Math.floor(
			(conference.startAssignment.getTime() - now.getTime()) / MS_PER_DAY
		)
	};
}

// ── Registration totals (unfiltered) ────────────────────────────────────────

async function fetchRegistrations(conferenceId: string) {
	const [delegations, singleParticipants, supervisors, roles] = await Promise.all([
		db.query.delegation.findMany({
			where: { conferenceId },
			columns: { applied: true, createdAt: true },
			with: { members: { columns: { id: true } } }
		}),
		db.query.singleParticipant.findMany({
			where: { conferenceId },
			columns: { applied: true }
		}),
		db.query.conferenceSupervisor.findMany({
			where: { conferenceId },
			columns: { id: true, userId: true, createdAt: true, plansOwnAttendenceAtConference: true },
			with: {
				supervisedDelegationMembers: {
					columns: { id: true },
					with: {
						delegation: {
							columns: {
								applied: true,
								assignedNationAlpha3Code: true,
								assignedNonStateActorId: true
							}
						}
					}
				},
				supervisedSingleParticipants: { columns: { applied: true, assignedRoleId: true } }
			}
		}),
		db.query.customConferenceRole.findMany({
			where: { conferenceId },
			columns: { name: true, fontAwesomeIcon: true },
			with: { singleParticipant: { columns: { applied: true } } }
		})
	]);
	return { delegations, singleParticipants, supervisors, roles };
}

type Registrations = Awaited<ReturnType<typeof fetchRegistrations>>;
type Supervisor = Registrations['supervisors'][number];

/** A supervisor is selected by a filter through the participants they supervise. */
function supervisorMatchesFilter(supervisor: Supervisor, filter: StatsFilterType) {
	const anyApplied =
		supervisor.supervisedDelegationMembers.some((member) => member.delegation.applied) ||
		supervisor.supervisedSingleParticipants.some((participant) => participant.applied);
	const withRole =
		supervisor.supervisedDelegationMembers.some(
			(member) =>
				member.delegation.applied &&
				(member.delegation.assignedNationAlpha3Code || member.delegation.assignedNonStateActorId)
		) ||
		supervisor.supervisedSingleParticipants.some(
			(participant) => participant.applied && participant.assignedRoleId
		);

	switch (filter) {
		case 'ALL':
			return true;
		case 'APPLIED':
			return anyApplied;
		case 'NOT_APPLIED':
			return !anyApplied;
		case 'APPLIED_WITH_ROLE':
			return withRole;
		case 'APPLIED_WITHOUT_ROLE':
			return anyApplied && !withRole;
	}
}

/** Users of the supervisors who attend the conference themselves. */
function attendingSupervisorUserIds(supervisors: Supervisor[]) {
	return supervisors
		.filter((supervisor) => supervisor.plansOwnAttendenceAtConference)
		.map((supervisor) => supervisor.userId);
}

function registrationStatisticsOf(
	{ delegations, singleParticipants, roles }: Registrations,
	filteredSupervisorCount: number
) {
	const delegationsApplied = delegations.filter((delegation) => delegation.applied).length;
	const delegationMembersTotal = delegations.reduce(
		(sum, delegation) => sum + delegation.members.length,
		0
	);
	const delegationMembersApplied = delegations.reduce(
		(sum, delegation) => (delegation.applied ? sum + delegation.members.length : sum),
		0
	);
	const singleParticipantsApplied = singleParticipants.filter(
		(participant) => participant.applied
	).length;

	const totalApplied = delegationMembersApplied + singleParticipantsApplied;
	const totalNotApplied = delegationMembersTotal + singleParticipants.length - totalApplied;

	return {
		total: totalApplied + totalNotApplied,
		notApplied: totalNotApplied,
		applied: totalApplied,
		delegations: {
			total: delegations.length,
			notApplied: delegations.length - delegationsApplied,
			applied: delegationsApplied
		},
		delegationMembers: {
			total: delegationMembersTotal,
			notApplied: delegationMembersTotal - delegationMembersApplied,
			applied: delegationMembersApplied
		},
		singleParticipants: {
			total: singleParticipants.length,
			notApplied: singleParticipants.length - singleParticipantsApplied,
			applied: singleParticipantsApplied,
			byRole: roles.map((role) => ({
				role: role.name,
				fontAwesomeIcon: role.fontAwesomeIcon || undefined,
				total: role.singleParticipant.length,
				applied: role.singleParticipant.filter((participant) => participant.applied).length,
				notApplied: role.singleParticipant.filter((participant) => !participant.applied).length
			}))
		},
		supervisors: filteredSupervisorCount
	};
}

// ── Supervisors (unfiltered) ────────────────────────────────────────────────

function supervisorStatsOf(supervisors: Supervisor[]) {
	const stats = {
		total: supervisors.length,
		accepted: 0,
		rejected: 0,
		plansAttendance: 0,
		doesNotPlanAttendance: 0,
		acceptedAndPresent: 0,
		acceptedAndNotPresent: 0,
		rejectedAndPresent: 0,
		rejectedAndNotPresent: 0
	};

	for (const supervisor of supervisors) {
		// "Accepted" means at least one of their participants got a role.
		const accepted =
			supervisor.supervisedDelegationMembers.some(
				(member) =>
					member.delegation.assignedNationAlpha3Code || member.delegation.assignedNonStateActorId
			) ||
			supervisor.supervisedSingleParticipants.some((participant) => participant.assignedRoleId);
		const present = supervisor.plansOwnAttendenceAtConference;

		stats[present ? 'plansAttendance' : 'doesNotPlanAttendance']++;
		stats[accepted ? 'accepted' : 'rejected']++;
		if (accepted) stats[present ? 'acceptedAndPresent' : 'acceptedAndNotPresent']++;
		else stats[present ? 'rejectedAndPresent' : 'rejectedAndNotPresent']++;
	}
	return stats;
}

// ── Diet and gender (filtered) ──────────────────────────────────────────────

async function dietAndGenderOf(
	conferenceId: string,
	filter: StatsFilterType,
	filteredSupervisorUserIds: string[]
) {
	const singleParticipantUsers: UserFilter = {
		singleParticipant: singleParticipantWhere(conferenceId, filter)
	};
	const delegationMemberUsers: UserFilter = {
		delegationMemberships: delegationMemberWhere(conferenceId, filter)
	};
	const teamMemberUsers: UserFilter = { teamMember: { conferenceId } };
	const supervisorUsers: UserFilter = { id: { in: filteredSupervisorUserIds } };
	// An empty `in` list would compile to invalid SQL, so the answer is filled in directly.
	const noSupervisors = filteredSupervisorUserIds.length === 0;

	const [
		singleParticipantDiet,
		delegationMemberDiet,
		supervisorDiet,
		teamMemberDiet,
		singleParticipantGender,
		delegationMemberGender,
		supervisorGender,
		teamMemberGender
	] = await Promise.all([
		dietOf(singleParticipantUsers),
		dietOf(delegationMemberUsers),
		noSupervisors ? zeroDiet : dietOf(supervisorUsers),
		dietOf(teamMemberUsers),
		genderOf(singleParticipantUsers),
		genderOf(delegationMemberUsers),
		noSupervisors ? zeroGender : genderOf(supervisorUsers),
		genderOf(teamMemberUsers)
	]);

	return {
		diet: {
			singleParticipants: singleParticipantDiet,
			delegationMembers: delegationMemberDiet,
			supervisors: supervisorDiet,
			teamMembers: teamMemberDiet
		},
		gender: {
			singleParticipants: singleParticipantGender,
			delegationMembers: delegationMemberGender,
			supervisors: supervisorGender,
			teamMembers: teamMemberGender
		}
	};
}

// ── Postal and payment status (unfiltered) ──────────────────────────────────

async function fetchParticipantStatuses(conferenceId: string) {
	return db.query.conferenceParticipantStatus.findMany({
		where: { conferenceId },
		columns: {
			userId: true,
			paymentStatus: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			didAttend: true
		},
		with: { user: { columns: { birthday: true } } }
	});
}

type ParticipantStatus = Awaited<ReturnType<typeof fetchParticipantStatuses>>[number];

/** Guardian consent only matters for participants who are still minors at the conference. */
function postalChecks(startConference: Date) {
	return {
		isPostalDone: (entry: ParticipantStatus) =>
			entry.termsAndConditions === 'DONE' &&
			(ofAgeAtConference(startConference, entry.user.birthday) ||
				entry.guardianConsent === 'DONE') &&
			entry.mediaConsent === 'DONE',
		hasPostalProblem: (entry: ParticipantStatus) =>
			entry.termsAndConditions === 'PROBLEM' ||
			(!ofAgeAtConference(startConference, entry.user.birthday) &&
				entry.guardianConsent === 'PROBLEM') ||
			entry.mediaConsent === 'PROBLEM'
	};
}

/** Only participants who actually got a seat are expected to complete postal and payment. */
async function progressUserIdsOf(conferenceId: string, supervisors: Supervisor[]) {
	const [membersWithRole, participantsWithRole] = await Promise.all([
		db.query.delegationMember.findMany({
			where: {
				conferenceId,
				delegation: {
					OR: [
						{ assignedNationAlpha3Code: { isNotNull: true } },
						{ assignedNonStateActorId: { isNotNull: true } }
					]
				}
			},
			columns: { userId: true }
		}),
		db.query.singleParticipant.findMany({
			where: { conferenceId, assignedRoleId: { isNotNull: true } },
			columns: { userId: true }
		})
	]);

	return new Set([
		...membersWithRole.map((member) => member.userId),
		...participantsWithRole.map((participant) => participant.userId),
		...attendingSupervisorUserIds(supervisors)
	]);
}

function percentage(part: number, whole: number) {
	return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function postalBucket(done: boolean, problem: boolean) {
	if (done) return 'postalDone';
	return problem ? 'postalProblem' : 'postalPending';
}

function paymentBucket(status: ParticipantStatus['paymentStatus']) {
	if (status === 'DONE') return 'paymentDone';
	return status === 'PROBLEM' ? 'paymentProblem' : 'paymentPending';
}

/** Which of postal and payment are complete; neither is not counted, it is the remainder. */
function completionBucket(postal: boolean, payment: boolean) {
	if (postal && payment) return 'bothComplete';
	if (postal) return 'postalOnlyComplete';
	if (payment) return 'paymentOnlyComplete';
	return undefined;
}

function postalPaymentProgressOf(
	participantStatuses: ParticipantStatus[],
	progressUserIds: Set<string>,
	{ isPostalDone, hasPostalProblem }: ReturnType<typeof postalChecks>
) {
	const maxParticipants = progressUserIds.size;
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

	for (const entry of participantStatuses) {
		if (!progressUserIds.has(entry.userId)) continue;

		const postal = isPostalDone(entry);
		counts[postalBucket(postal, hasPostalProblem(entry))]++;

		const payment = entry.paymentStatus === 'DONE';
		counts[paymentBucket(entry.paymentStatus)]++;

		const completion = completionBucket(postal, payment);
		if (completion) counts[completion]++;
	}

	return {
		maxParticipants,
		postalDone: counts.postalDone,
		postalPending: counts.postalPending,
		postalProblem: counts.postalProblem,
		postalPercentage: percentage(counts.postalDone, maxParticipants),
		paymentDone: counts.paymentDone,
		paymentPending: counts.paymentPending,
		paymentProblem: counts.paymentProblem,
		paymentPercentage: percentage(counts.paymentDone, maxParticipants),
		bothComplete: counts.bothComplete,
		postalOnlyComplete: counts.postalOnlyComplete,
		paymentOnlyComplete: counts.paymentOnlyComplete,
		// Participants with no status row at all fall in here too.
		neitherComplete:
			maxParticipants - counts.bothComplete - counts.postalOnlyComplete - counts.paymentOnlyComplete
	};
}

async function participantStatusStatsOf(
	conferenceId: string,
	startConference: Date,
	supervisors: Supervisor[]
) {
	const participantStatuses = await fetchParticipantStatuses(conferenceId);
	const checks = postalChecks(startConference);

	const status = {
		paymentStatus: {
			done: participantStatuses.filter((entry) => entry.paymentStatus === 'DONE').length,
			problem: participantStatuses.filter((entry) => entry.paymentStatus === 'PROBLEM').length
		},
		postalStatus: {
			done: participantStatuses.filter(checks.isPostalDone).length,
			problem: participantStatuses.filter(checks.hasPostalProblem).length
		},
		didAttend: participantStatuses.filter((entry) => entry.didAttend).length
	};

	const progressUserIds = await progressUserIdsOf(conferenceId, supervisors);
	return {
		status,
		postalPaymentProgress: postalPaymentProgressOf(participantStatuses, progressUserIds, checks)
	};
}

// ── Addresses and nationalities (filtered) ──────────────────────────────────

async function addressesAndNationalitiesOf(conferenceId: string, filter: StatsFilterType) {
	const filteredUsers = await db.query.user.findMany({
		where: userWhere(conferenceId, filter),
		columns: { country: true, zip: true }
	});

	const addressGroups = new Map<
		string,
		{
			country: string | null;
			zip: string | null;
			_count: { zip: number; country: number; _all: number };
		}
	>();
	const nationalityCounts = new Map<string, number>();

	for (const user of filteredUsers) {
		const key = `${user.country ?? ''}:${user.zip ?? ''}`;
		const existing = addressGroups.get(key) ?? {
			country: user.country,
			zip: user.zip,
			_count: { zip: 0, country: 0, _all: 0 }
		};
		existing._count._all++;
		if (user.zip !== null) existing._count.zip++;
		if (user.country !== null) existing._count.country++;
		addressGroups.set(key, existing);

		if (user.country === null) continue;
		nationalityCounts.set(user.country, (nationalityCounts.get(user.country) ?? 0) + 1);
	}

	return {
		addresses: [...addressGroups.values()],
		nationalityDistribution: [...nationalityCounts.entries()].map(([country, count]) => ({
			country,
			countryCode: country,
			count
		}))
	};
}

// ── Role assignment breakdown (filtered) ────────────────────────────────────

const withRoleDelegation: DelegationFilter = {
	OR: [
		{ assignedNationAlpha3Code: { isNotNull: true } },
		{ assignedNonStateActorId: { isNotNull: true } }
	]
};
const withoutRoleDelegation: DelegationFilter = {
	assignedNationAlpha3Code: { isNull: true },
	assignedNonStateActorId: { isNull: true }
};

/** Members, single participants and delegations on one side of the role split. */
async function roleSplitCounts(conferenceId: string, filter: StatsFilterType, withRole: boolean) {
	const delegationSide = withRole ? withRoleDelegation : withoutRoleDelegation;
	return Promise.all([
		countDelegationMembers({
			conferenceId,
			delegation: { ...delegationConditions(filter), ...delegationSide }
		}),
		countSingleParticipants({
			...singleParticipantWhere(conferenceId, filter),
			assignedRoleId: withRole ? { isNotNull: true } : { isNull: true }
		}),
		countDelegations({
			where: { ...delegationWhere(conferenceId, filter), ...delegationSide },
			columns: { id: true }
		})
	]);
}

async function roleBasedOf(conferenceId: string, filter: StatsFilterType) {
	// A filter that already selects one side of the split makes the other side meaningless, so
	// it stays at zero rather than showing a number the filter contradicts.
	const showWithRole = filter !== 'NOT_APPLIED' && filter !== 'APPLIED_WITHOUT_ROLE';
	const showWithoutRole = filter !== 'NOT_APPLIED' && filter !== 'APPLIED_WITH_ROLE';
	const zeros: [number, number, number] = [0, 0, 0];

	// Committee seats only exist for nations, so non-state actors are left out here.
	const committeeAssignedDelegation: DelegationFilter = {
		applied: true,
		assignedNationAlpha3Code: { isNotNull: true }
	};

	const [
		[delegationMembersWithRole, singleParticipantsWithRole, delegationsWithAssignment],
		[delegationMembersWithoutRole, singleParticipantsWithoutRole, delegationsWithoutAssignment],
		delegationMembersWithCommittee,
		delegationMembersWithoutCommittee
	] = await Promise.all([
		showWithRole ? roleSplitCounts(conferenceId, filter, true) : zeros,
		showWithoutRole ? roleSplitCounts(conferenceId, filter, false) : zeros,
		countDelegationMembers({
			conferenceId,
			assignedCommitteeId: { isNotNull: true },
			delegation: committeeAssignedDelegation
		}),
		countDelegationMembers({
			conferenceId,
			assignedCommitteeId: { isNull: true },
			delegation: committeeAssignedDelegation
		})
	]);

	return {
		delegationMembersWithRole,
		delegationMembersWithoutRole,
		delegationMembersWithCommittee,
		delegationMembersWithoutCommittee,
		singleParticipantsWithRole,
		singleParticipantsWithoutRole,
		delegationsWithAssignment,
		delegationsWithoutAssignment
	};
}

// ── Committee fill rates (unfiltered, applied delegations only) ─────────────

async function committeeFillRatesOf(conferenceId: string) {
	const committees = await db.query.committee.findMany({
		where: { conferenceId },
		with: {
			nations: { columns: { alpha3Code: true } },
			delegationMembers: {
				where: { delegation: { applied: true } },
				columns: { id: true }
			}
		}
	});

	return committees.map((committee) => {
		const totalSeats = committee.nations.length * committee.numOfSeatsPerDelegation;
		const assignedSeats = committee.delegationMembers.length;
		return {
			committeeId: committee.id,
			name: committee.name,
			abbreviation: committee.abbreviation,
			totalSeats,
			assignedSeats,
			fillPercentage: percentage(assignedSeats, totalSeats)
		};
	});
}

// ── Registration timeline and schools (filtered) ────────────────────────────

type TimelineDay = {
	delegations: number;
	delegationMembers: number;
	singleParticipants: number;
	supervisors: number;
};

const dayOf = (date: Date) => date.toISOString().split('T')[0];

/** Running totals per day; days without registrations are filled in so the x axis stays linear. */
function cumulativeTimeline(timeline: Map<string, TimelineDay>) {
	const sortedDays = [...timeline.keys()].sort();
	const registrationTimeline: {
		date: string;
		cumulativeDelegations: number;
		cumulativeDelegationMembers: number;
		cumulativeSingleParticipants: number;
		cumulativeSupervisors: number;
	}[] = [];
	if (sortedDays.length === 0) return registrationTimeline;

	const totals = { delegations: 0, delegationMembers: 0, singleParticipants: 0, supervisors: 0 };
	const cursor = new Date(sortedDays[0]);
	const end = new Date(sortedDays[sortedDays.length - 1]);

	while (cursor <= end) {
		const date = dayOf(cursor);
		const day = timeline.get(date);
		if (day) {
			totals.delegations += day.delegations;
			totals.delegationMembers += day.delegationMembers;
			totals.singleParticipants += day.singleParticipants;
			totals.supervisors += day.supervisors;
		}
		registrationTimeline.push({
			date,
			cumulativeDelegations: totals.delegations,
			cumulativeDelegationMembers: totals.delegationMembers,
			cumulativeSingleParticipants: totals.singleParticipants,
			cumulativeSupervisors: totals.supervisors
		});
		cursor.setDate(cursor.getDate() + 1);
	}
	return registrationTimeline;
}

function schoolStatsOf(delegations: { school: string | null; members: unknown[] }[]) {
	const schoolMap = new Map<string, { delegationCount: number; memberCount: number }>();
	for (const delegation of delegations) {
		const school = delegation.school || 'Unknown';
		const existing = schoolMap.get(school) ?? { delegationCount: 0, memberCount: 0 };
		existing.delegationCount++;
		existing.memberCount += delegation.members.length;
		schoolMap.set(school, existing);
	}

	return [...schoolMap.entries()]
		.map(([school, data]) => ({
			school,
			delegationCount: data.delegationCount,
			memberCount: data.memberCount
		}))
		.sort((a, b) => b.memberCount - a.memberCount);
}

async function timelineAndSchoolsOf(
	conferenceId: string,
	filter: StatsFilterType,
	filteredSupervisors: Supervisor[]
) {
	const [timelineDelegations, timelineSingleParticipants] = await Promise.all([
		db.query.delegation.findMany({
			where: delegationWhere(conferenceId, filter),
			columns: { createdAt: true, school: true },
			with: { members: { columns: { id: true } } }
		}),
		db.query.singleParticipant.findMany({
			where: singleParticipantWhere(conferenceId, filter),
			columns: { createdAt: true }
		})
	]);

	const timeline = new Map<string, TimelineDay>();
	const dayEntry = (date: Date) => {
		const key = dayOf(date);
		const existing = timeline.get(key) ?? {
			delegations: 0,
			delegationMembers: 0,
			singleParticipants: 0,
			supervisors: 0
		};
		timeline.set(key, existing);
		return existing;
	};

	for (const delegation of timelineDelegations) {
		const entry = dayEntry(delegation.createdAt);
		entry.delegations++;
		entry.delegationMembers += delegation.members.length;
	}
	for (const participant of timelineSingleParticipants) {
		dayEntry(participant.createdAt).singleParticipants++;
	}
	for (const supervisor of filteredSupervisors) {
		dayEntry(supervisor.createdAt).supervisors++;
	}

	return {
		registrationTimeline: cumulativeTimeline(timeline),
		// Same set of delegations the timeline is built from, grouped by school instead of by day.
		schoolStats: schoolStatsOf(timelineDelegations)
	};
}

// ── Waiting list (unfiltered) ───────────────────────────────────────────────

async function waitingListOf(conferenceId: string) {
	const waitingListEntries = await db.query.waitingListEntry.findMany({
		where: { conferenceId },
		columns: { hidden: true, assigned: true }
	});

	const visible = waitingListEntries.filter((entry) => !entry.hidden).length;
	const assigned = waitingListEntries.filter((entry) => entry.assigned).length;
	return {
		total: waitingListEntries.length,
		visible,
		hidden: waitingListEntries.length - visible,
		assigned,
		unassigned: waitingListEntries.length - assigned
	};
}

// ── Papers (unfiltered) ─────────────────────────────────────────────────────

async function papersByCommitteeOf(papers: { agendaItemId: string | null }[]) {
	const agendaItemIds = [
		...new Set(papers.map((paper) => paper.agendaItemId).filter((id) => id !== null))
	];
	const agendaItems =
		agendaItemIds.length > 0
			? await db.query.committeeAgendaItem.findMany({
					where: { id: { in: agendaItemIds } },
					columns: { id: true },
					with: { committee: { columns: { id: true, name: true, abbreviation: true } } }
				})
			: [];

	const papersByCommittee = new Map<
		string,
		{ name: string; abbreviation: string; count: number }
	>();
	for (const paper of papers) {
		if (!paper.agendaItemId) continue;
		const committee = agendaItems.find((item) => item.id === paper.agendaItemId)?.committee;
		if (!committee) continue;
		const existing = papersByCommittee.get(committee.id);
		if (existing) {
			existing.count++;
		} else {
			papersByCommittee.set(committee.id, {
				name: committee.name,
				abbreviation: committee.abbreviation,
				count: 1
			});
		}
	}

	return [...papersByCommittee.entries()].map(([committeeId, data]) => ({
		committeeId,
		name: data.name,
		abbreviation: data.abbreviation,
		count: data.count
	}));
}

async function paperStatsOf(conferenceId: string) {
	const papers = await db.query.paper.findMany({
		where: { conferenceId },
		columns: { id: true, type: true, status: true, agendaItemId: true },
		with: { versions: { columns: { id: true }, with: { reviews: { columns: { id: true } } } } }
	});

	const papersWithReviews = papers.filter((paper) =>
		paper.versions.some((version) => version.reviews.length > 0)
	).length;
	const countWhere = (predicate: (paper: (typeof papers)[number]) => boolean) =>
		papers.filter(predicate).length;

	return {
		total: papers.length,
		byType: {
			positionPaper: countWhere((paper) => paper.type === 'POSITION_PAPER'),
			workingPaper: countWhere((paper) => paper.type === 'WORKING_PAPER'),
			introductionPaper: countWhere((paper) => paper.type === 'INTRODUCTION_PAPER')
		},
		byStatus: {
			draft: countWhere((paper) => paper.status === 'DRAFT'),
			submitted: countWhere((paper) => paper.status === 'SUBMITTED'),
			changesRequested: countWhere((paper) => paper.status === 'CHANGES_REQUESTED'),
			accepted: countWhere((paper) => paper.status === 'ACCEPTED')
		},
		withReviews: papersWithReviews,
		withoutReviews: papers.length - papersWithReviews,
		byCommittee: await papersByCommitteeOf(papers)
	};
}

/**
 * Everything the conference statistics dashboard shows, in one pass.
 *
 * Not every block honours the filter: registration totals, supervisor breakdown, postal and
 * payment progress, the waiting list and the paper statistics always describe the whole
 * conference, because they are about its operational state rather than about a subset of
 * registrations. The blocks that do respond to the filter say so at their definition.
 */
export async function conferenceStats({
	conferenceId,
	filter = 'ALL'
}: {
	conferenceId: string;
	filter?: StatsFilterType;
}) {
	const conference = await db.query.conference
		.findFirst({ where: { id: conferenceId } })
		.then(assertFindFirstExists);

	const registrations = await fetchRegistrations(conferenceId);
	const filteredSupervisors = registrations.supervisors.filter((supervisor) =>
		supervisorMatchesFilter(supervisor, filter)
	);

	const ageStatistics = await getAgeStatistics({
		conferenceId,
		filter,
		referenceDate: conference.endConference ?? conference.startConference ?? new Date()
	});
	const { diet, gender } = await dietAndGenderOf(
		conferenceId,
		filter,
		attendingSupervisorUserIds(filteredSupervisors)
	);
	const { status, postalPaymentProgress } = await participantStatusStatsOf(
		conferenceId,
		conference.startConference,
		registrations.supervisors
	);
	const { addresses, nationalityDistribution } = await addressesAndNationalitiesOf(
		conferenceId,
		filter
	);
	const roleBased = await roleBasedOf(conferenceId, filter);
	const committeeFillRates = await committeeFillRatesOf(conferenceId);
	const { registrationTimeline, schoolStats } = await timelineAndSchoolsOf(
		conferenceId,
		filter,
		filteredSupervisors
	);

	return {
		countdowns: countdownsOf(conference),
		registrationStatistics: registrationStatisticsOf(registrations, filteredSupervisors.length),
		ageStatistics,
		diet,
		gender,
		status,
		addresses,
		roleBased,
		committeeFillRates,
		registrationTimeline,
		nationalityDistribution,
		schoolStats,
		waitingList: await waitingListOf(conferenceId),
		supervisorStats: supervisorStatsOf(registrations.supervisors),
		postalPaymentProgress,
		paperStats: await paperStatsOf(conferenceId)
	};
}
