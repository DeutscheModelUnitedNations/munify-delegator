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

	const now = new Date();
	const countdowns = {
		daysUntilConference: Math.floor(
			(conference.startConference.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		),
		daysUntilEndRegistration: Math.floor(
			(conference.startAssignment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		)
	};

	// ── Registration totals (unfiltered) ────────────────────────────────────

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

	// A supervisor is selected by a filter through the participants they supervise.
	const filteredSupervisors = supervisors.filter((supervisor) => {
		const appliedDelegation = supervisor.supervisedDelegationMembers.some(
			(member) => member.delegation.applied
		);
		const appliedSingle = supervisor.supervisedSingleParticipants.some(
			(participant) => participant.applied
		);
		const withRole =
			supervisor.supervisedDelegationMembers.some(
				(member) =>
					member.delegation.applied &&
					(member.delegation.assignedNationAlpha3Code || member.delegation.assignedNonStateActorId)
			) ||
			supervisor.supervisedSingleParticipants.some(
				(participant) => participant.applied && participant.assignedRoleId
			);
		const anyApplied = appliedDelegation || appliedSingle;

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
	});

	const filteredSupervisorUserIds = filteredSupervisors
		.filter((supervisor) => supervisor.plansOwnAttendenceAtConference)
		.map((supervisor) => supervisor.userId);

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

	const registrationStatistics = {
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
		supervisors: filteredSupervisors.length
	};

	// ── Supervisors (unfiltered) ────────────────────────────────────────────

	const supervisorStats = supervisors.reduce(
		(acc, supervisor) => {
			// "Accepted" means at least one of their participants got a role.
			const hasAcceptedParticipant =
				supervisor.supervisedDelegationMembers.some(
					(member) =>
						member.delegation.assignedNationAlpha3Code || member.delegation.assignedNonStateActorId
				) ||
				supervisor.supervisedSingleParticipants.some((participant) => participant.assignedRoleId);
			const plansOwn = supervisor.plansOwnAttendenceAtConference;

			if (plansOwn) acc.plansAttendance++;
			else acc.doesNotPlanAttendance++;

			if (hasAcceptedParticipant) {
				acc.accepted++;
				if (plansOwn) acc.acceptedAndPresent++;
				else acc.acceptedAndNotPresent++;
			} else {
				acc.rejected++;
				if (plansOwn) acc.rejectedAndPresent++;
				else acc.rejectedAndNotPresent++;
			}
			return acc;
		},
		{
			total: supervisors.length,
			accepted: 0,
			rejected: 0,
			plansAttendance: 0,
			doesNotPlanAttendance: 0,
			acceptedAndPresent: 0,
			acceptedAndNotPresent: 0,
			rejectedAndPresent: 0,
			rejectedAndNotPresent: 0
		}
	);

	// ── Age, diet and gender (filtered) ─────────────────────────────────────

	const ageStatistics = await getAgeStatistics({
		conferenceId,
		filter,
		referenceDate: conference.endConference ?? conference.startConference ?? new Date()
	});

	const singleParticipantUsers: UserFilter = {
		singleParticipant: singleParticipantWhere(conferenceId, filter)
	};
	const delegationMemberUsers: UserFilter = {
		delegationMemberships: delegationMemberWhere(conferenceId, filter)
	};
	const teamMemberUsers: UserFilter = { teamMember: { conferenceId } };
	const supervisorUsers: UserFilter = { id: { in: filteredSupervisorUserIds } };

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
		// An empty `in` list would compile to invalid SQL, so the answer is filled in directly.
		filteredSupervisorUserIds.length === 0 ? zeroDiet : dietOf(supervisorUsers),
		dietOf(teamMemberUsers),
		genderOf(singleParticipantUsers),
		genderOf(delegationMemberUsers),
		filteredSupervisorUserIds.length === 0 ? zeroGender : genderOf(supervisorUsers),
		genderOf(teamMemberUsers)
	]);

	const diet = {
		singleParticipants: singleParticipantDiet,
		delegationMembers: delegationMemberDiet,
		supervisors: supervisorDiet,
		teamMembers: teamMemberDiet
	};

	const gender = {
		singleParticipants: singleParticipantGender,
		delegationMembers: delegationMemberGender,
		supervisors: supervisorGender,
		teamMembers: teamMemberGender
	};

	// ── Postal and payment status (unfiltered) ──────────────────────────────

	const participantStatuses = await db.query.conferenceParticipantStatus.findMany({
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

	/** Guardian consent only matters for participants who are still minors at the conference. */
	const isPostalDone = (entry: (typeof participantStatuses)[number]) =>
		entry.termsAndConditions === 'DONE' &&
		(ofAgeAtConference(conference.startConference, entry.user.birthday) ||
			entry.guardianConsent === 'DONE') &&
		entry.mediaConsent === 'DONE';

	const hasPostalProblem = (entry: (typeof participantStatuses)[number]) =>
		entry.termsAndConditions === 'PROBLEM' ||
		(!ofAgeAtConference(conference.startConference, entry.user.birthday) &&
			entry.guardianConsent === 'PROBLEM') ||
		entry.mediaConsent === 'PROBLEM';

	const status = {
		paymentStatus: {
			done: participantStatuses.filter((entry) => entry.paymentStatus === 'DONE').length,
			problem: participantStatuses.filter((entry) => entry.paymentStatus === 'PROBLEM').length
		},
		postalStatus: {
			done: participantStatuses.filter(isPostalDone).length,
			problem: participantStatuses.filter(hasPostalProblem).length
		},
		didAttend: participantStatuses.filter((entry) => entry.didAttend).length
	};

	// Only participants who actually got a seat are expected to complete postal and payment.
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

	const progressUserIds = new Set([
		...membersWithRole.map((member) => member.userId),
		...participantsWithRole.map((participant) => participant.userId),
		...supervisors
			.filter((supervisor) => supervisor.plansOwnAttendenceAtConference)
			.map((supervisor) => supervisor.userId)
	]);
	const maxParticipants = progressUserIds.size;

	let postalDone = 0;
	let postalPending = 0;
	let postalProblem = 0;
	let paymentDone = 0;
	let paymentPending = 0;
	let paymentProblem = 0;
	let bothComplete = 0;
	let postalOnlyComplete = 0;
	let paymentOnlyComplete = 0;

	for (const entry of participantStatuses) {
		if (!progressUserIds.has(entry.userId)) continue;

		const postal = isPostalDone(entry);
		if (postal) postalDone++;
		else if (hasPostalProblem(entry)) postalProblem++;
		else postalPending++;

		const payment = entry.paymentStatus === 'DONE';
		if (payment) paymentDone++;
		else if (entry.paymentStatus === 'PROBLEM') paymentProblem++;
		else paymentPending++;

		if (postal && payment) bothComplete++;
		else if (postal) postalOnlyComplete++;
		else if (payment) paymentOnlyComplete++;
	}

	const postalPaymentProgress = {
		maxParticipants,
		postalDone,
		postalPending,
		postalProblem,
		postalPercentage: maxParticipants > 0 ? Math.round((postalDone / maxParticipants) * 100) : 0,
		paymentDone,
		paymentPending,
		paymentProblem,
		paymentPercentage: maxParticipants > 0 ? Math.round((paymentDone / maxParticipants) * 100) : 0,
		bothComplete,
		postalOnlyComplete,
		paymentOnlyComplete,
		// Participants with no status row at all fall in here too.
		neitherComplete: maxParticipants - bothComplete - postalOnlyComplete - paymentOnlyComplete
	};

	// ── Addresses and nationalities (filtered) ──────────────────────────────

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
	}

	const addresses = [...addressGroups.values()];

	const nationalityCounts = new Map<string, number>();
	for (const user of filteredUsers) {
		if (user.country === null) continue;
		nationalityCounts.set(user.country, (nationalityCounts.get(user.country) ?? 0) + 1);
	}

	const nationalityDistribution = [...nationalityCounts.entries()].map(([country, count]) => ({
		country,
		countryCode: country,
		count
	}));

	// ── Role assignment breakdown (filtered) ────────────────────────────────

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
	const filteredDelegation = delegationConditions(filter);

	// A filter that already selects one side of the split makes the other side meaningless, so
	// it stays at zero rather than showing a number the filter contradicts.
	const showWithRole = filter !== 'NOT_APPLIED' && filter !== 'APPLIED_WITHOUT_ROLE';
	const showWithoutRole = filter !== 'NOT_APPLIED' && filter !== 'APPLIED_WITH_ROLE';

	const [
		delegationMembersWithRole,
		delegationMembersWithoutRole,
		singleParticipantsWithRole,
		singleParticipantsWithoutRole,
		delegationsWithAssignment,
		delegationsWithoutAssignment
	] = await Promise.all([
		showWithRole
			? countDelegationMembers({
					conferenceId,
					delegation: { ...filteredDelegation, ...withRoleDelegation }
				})
			: 0,
		showWithoutRole
			? countDelegationMembers({
					conferenceId,
					delegation: { ...filteredDelegation, ...withoutRoleDelegation }
				})
			: 0,
		showWithRole
			? countSingleParticipants({
					...singleParticipantWhere(conferenceId, filter),
					assignedRoleId: { isNotNull: true }
				})
			: 0,
		showWithoutRole
			? countSingleParticipants({
					...singleParticipantWhere(conferenceId, filter),
					assignedRoleId: { isNull: true }
				})
			: 0,
		showWithRole
			? countDelegations({
					where: { ...delegationWhere(conferenceId, filter), ...withRoleDelegation },
					columns: { id: true }
				})
			: 0,
		showWithoutRole
			? countDelegations({
					where: { ...delegationWhere(conferenceId, filter), ...withoutRoleDelegation },
					columns: { id: true }
				})
			: 0
	]);

	// Committee seats only exist for nations, so non-state actors are left out here.
	const committeeAssignedDelegation: DelegationFilter = {
		applied: true,
		assignedNationAlpha3Code: { isNotNull: true }
	};
	const [delegationMembersWithCommittee, delegationMembersWithoutCommittee] = await Promise.all([
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

	const roleBased = {
		delegationMembersWithRole,
		delegationMembersWithoutRole,
		delegationMembersWithCommittee,
		delegationMembersWithoutCommittee,
		singleParticipantsWithRole,
		singleParticipantsWithoutRole,
		delegationsWithAssignment,
		delegationsWithoutAssignment
	};

	// ── Committee fill rates (unfiltered, applied delegations only) ─────────

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

	const committeeFillRates = committees.map((committee) => {
		const totalSeats = committee.nations.length * committee.numOfSeatsPerDelegation;
		const assignedSeats = committee.delegationMembers.length;
		return {
			committeeId: committee.id,
			name: committee.name,
			abbreviation: committee.abbreviation,
			totalSeats,
			assignedSeats,
			fillPercentage: totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) : 0
		};
	});

	// ── Registration timeline (filtered) ────────────────────────────────────

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

	type TimelineDay = {
		delegations: number;
		delegationMembers: number;
		singleParticipants: number;
		supervisors: number;
	};
	const timeline = new Map<string, TimelineDay>();
	const dayOf = (date: Date) => date.toISOString().split('T')[0];
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

	const sortedDays = [...timeline.keys()].sort();
	const registrationTimeline: {
		date: string;
		cumulativeDelegations: number;
		cumulativeDelegationMembers: number;
		cumulativeSingleParticipants: number;
		cumulativeSupervisors: number;
	}[] = [];

	if (sortedDays.length > 0) {
		// Days without registrations are filled in so the chart's x axis stays linear.
		let cumulativeDelegations = 0;
		let cumulativeDelegationMembers = 0;
		let cumulativeSingleParticipants = 0;
		let cumulativeSupervisors = 0;

		const cursor = new Date(sortedDays[0]);
		const end = new Date(sortedDays[sortedDays.length - 1]);

		while (cursor <= end) {
			const date = dayOf(cursor);
			const day = timeline.get(date);
			if (day) {
				cumulativeDelegations += day.delegations;
				cumulativeDelegationMembers += day.delegationMembers;
				cumulativeSingleParticipants += day.singleParticipants;
				cumulativeSupervisors += day.supervisors;
			}
			registrationTimeline.push({
				date,
				cumulativeDelegations,
				cumulativeDelegationMembers,
				cumulativeSingleParticipants,
				cumulativeSupervisors
			});
			cursor.setDate(cursor.getDate() + 1);
		}
	}

	// ── Schools (filtered) ──────────────────────────────────────────────────

	// Same set of delegations the timeline is built from, grouped by school instead of by day.
	const schoolMap = new Map<string, { delegationCount: number; memberCount: number }>();
	for (const delegation of timelineDelegations) {
		const school = delegation.school || 'Unknown';
		const existing = schoolMap.get(school) ?? { delegationCount: 0, memberCount: 0 };
		existing.delegationCount++;
		existing.memberCount += delegation.members.length;
		schoolMap.set(school, existing);
	}

	const schoolStats = [...schoolMap.entries()]
		.map(([school, data]) => ({
			school,
			delegationCount: data.delegationCount,
			memberCount: data.memberCount
		}))
		.sort((a, b) => b.memberCount - a.memberCount);

	// ── Waiting list (unfiltered) ───────────────────────────────────────────

	const waitingListEntries = await db.query.waitingListEntry.findMany({
		where: { conferenceId },
		columns: { hidden: true, assigned: true }
	});

	const waitingListVisible = waitingListEntries.filter((entry) => !entry.hidden).length;
	const waitingListAssigned = waitingListEntries.filter((entry) => entry.assigned).length;
	const waitingList = {
		total: waitingListEntries.length,
		visible: waitingListVisible,
		hidden: waitingListEntries.length - waitingListVisible,
		assigned: waitingListAssigned,
		unassigned: waitingListEntries.length - waitingListAssigned
	};

	// ── Papers (unfiltered) ─────────────────────────────────────────────────

	const papers = await db.query.paper.findMany({
		where: { conferenceId },
		columns: { id: true, type: true, status: true, agendaItemId: true },
		with: { versions: { columns: { id: true }, with: { reviews: { columns: { id: true } } } } }
	});

	const papersWithReviews = papers.filter((paper) =>
		paper.versions.some((version) => version.reviews.length > 0)
	).length;

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

	const paperStats = {
		total: papers.length,
		byType: {
			positionPaper: papers.filter((paper) => paper.type === 'POSITION_PAPER').length,
			workingPaper: papers.filter((paper) => paper.type === 'WORKING_PAPER').length,
			introductionPaper: papers.filter((paper) => paper.type === 'INTRODUCTION_PAPER').length
		},
		byStatus: {
			draft: papers.filter((paper) => paper.status === 'DRAFT').length,
			submitted: papers.filter((paper) => paper.status === 'SUBMITTED').length,
			changesRequested: papers.filter((paper) => paper.status === 'CHANGES_REQUESTED').length,
			accepted: papers.filter((paper) => paper.status === 'ACCEPTED').length
		},
		withReviews: papersWithReviews,
		withoutReviews: papers.length - papersWithReviews,
		byCommittee: [...papersByCommittee.entries()].map(([committeeId, data]) => ({
			committeeId,
			name: data.name,
			abbreviation: data.abbreviation,
			count: data.count
		}))
	};

	return {
		countdowns,
		registrationStatistics,
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
		waitingList,
		supervisorStats,
		postalPaymentProgress,
		paperStats
	};
}
