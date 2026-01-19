import { ofAgeAtConference } from '$lib/services/ageChecker';
import type { PrismaClient, Prisma } from '@prisma/client';
import { getAgeStatistics } from './ageStats';

// Filter type for statistics queries
export type StatsFilterType =
	| 'ALL'
	| 'APPLIED'
	| 'NOT_APPLIED'
	| 'APPLIED_WITH_ROLE'
	| 'APPLIED_WITHOUT_ROLE';

// Build where clause for SingleParticipant
function getSingleParticipantWhere(
	conferenceId: string,
	filter: StatsFilterType
): Prisma.SingleParticipantWhereInput {
	const base: Prisma.SingleParticipantWhereInput = { conferenceId };

	switch (filter) {
		case 'ALL':
			return base;
		case 'APPLIED':
			return { ...base, applied: true };
		case 'NOT_APPLIED':
			return { ...base, applied: false };
		case 'APPLIED_WITH_ROLE':
			return { ...base, applied: true, assignedRoleId: { not: null } };
		case 'APPLIED_WITHOUT_ROLE':
			return { ...base, applied: true, assignedRoleId: null };
	}
}

// Build where clause for Delegation
function getDelegationWhere(
	conferenceId: string,
	filter: StatsFilterType
): Prisma.DelegationWhereInput {
	const base: Prisma.DelegationWhereInput = { conferenceId };

	switch (filter) {
		case 'ALL':
			return base;
		case 'APPLIED':
			return { ...base, applied: true };
		case 'NOT_APPLIED':
			return { ...base, applied: false };
		case 'APPLIED_WITH_ROLE':
			return {
				...base,
				applied: true,
				OR: [
					{ assignedNationAlpha3Code: { not: null } },
					{ assignedNonStateActorId: { not: null } }
				]
			};
		case 'APPLIED_WITHOUT_ROLE':
			return {
				...base,
				applied: true,
				assignedNationAlpha3Code: null,
				assignedNonStateActorId: null
			};
	}
}

// Build where clause for DelegationMember (via delegation relation)
function getDelegationMemberWhere(
	conferenceId: string,
	filter: StatsFilterType
): Prisma.DelegationMemberWhereInput {
	const delegationWhere = getDelegationWhere(conferenceId, filter);
	// Remove conferenceId from delegation where since it's on the member
	const { conferenceId: _, ...delegationConditions } = delegationWhere;
	return {
		conferenceId,
		delegation: delegationConditions
	};
}

// Build where clause for User (via singleParticipant OR delegationMemberships)
function getUserWhere(conferenceId: string, filter: StatsFilterType): Prisma.UserWhereInput {
	const spWhere = getSingleParticipantWhere(conferenceId, filter);
	const dmWhere = getDelegationMemberWhere(conferenceId, filter);

	return {
		OR: [{ singleParticipant: { some: spWhere } }, { delegationMemberships: { some: dmWhere } }]
	};
}

// Zero diet/gender values for excluded categories
const zeroDiet = { omnivore: 0, vegetarian: 0, vegan: 0 };
const zeroGender = { male: 0, female: 0, diverse: 0, noStatement: 0 };

export async function conferenceStats({
	db,
	conferenceId,
	filter = 'ALL'
}: {
	db: PrismaClient;
	conferenceId: string;
	filter?: StatsFilterType;
}) {
	const conference = await db.conference.findUniqueOrThrow({
		where: {
			id: conferenceId
		}
	});

	// Countdowns (not affected by filter)
	const now = new Date();
	const daysUntilConference = Math.floor(
		(conference.startConference.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
	);
	const daysUntilEndRegistration = Math.floor(
		(conference.startAssignment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
	);

	const countdowns = {
		daysUntilConference,
		daysUntilEndRegistration
	};

	// Registration statistics (always returns full breakdown regardless of filter)
	const delegations = await db.delegation.findMany({
		where: {
			conferenceId
		},
		select: {
			applied: true,
			_count: {
				select: {
					members: true
				}
			}
		}
	});

	const singleParticipants = await db.singleParticipant.findMany({
		where: {
			conferenceId
		},
		select: {
			applied: true
		}
	});

	const supervisors = await db.conferenceSupervisor.findMany({
		where: {
			conferenceId
		},
		include: {
			supervisedDelegationMembers: {
				include: {
					delegation: {
						select: {
							applied: true,
							assignedNationAlpha3Code: true,
							assignedNonStateActorId: true
						}
					}
				}
			},
			supervisedSingleParticipants: {
				select: {
					applied: true,
					assignedRoleId: true
				}
			}
		}
	});

	// Get userId from related user for filtered supervisors
	const supervisorUsers = await db.conferenceSupervisor.findMany({
		where: { conferenceId },
		select: {
			id: true,
			userId: true,
			plansOwnAttendenceAtConference: true
		}
	});

	// Filter supervisors based on their supervised participants' status
	const filterSupervisors = (sups: typeof supervisors, filterType: StatsFilterType) => {
		return sups.filter((sup) => {
			const hasSupervisedAppliedDelegation = sup.supervisedDelegationMembers.some(
				(dm) => dm.delegation.applied
			);
			const hasSupervisedAppliedSP = sup.supervisedSingleParticipants.some((sp) => sp.applied);
			const hasSupervisedWithRole =
				sup.supervisedDelegationMembers.some(
					(dm) =>
						dm.delegation.applied &&
						(dm.delegation.assignedNationAlpha3Code || dm.delegation.assignedNonStateActorId)
				) || sup.supervisedSingleParticipants.some((sp) => sp.applied && sp.assignedRoleId);
			const hasAnyApplied = hasSupervisedAppliedDelegation || hasSupervisedAppliedSP;

			switch (filterType) {
				case 'ALL':
					return true;
				case 'APPLIED':
					return hasAnyApplied;
				case 'NOT_APPLIED':
					return !hasAnyApplied;
				case 'APPLIED_WITH_ROLE':
					return hasSupervisedWithRole;
				case 'APPLIED_WITHOUT_ROLE':
					// Has applied participants but none have roles
					return hasAnyApplied && !hasSupervisedWithRole;
			}
		});
	};

	const filteredSupervisors = filterSupervisors(supervisors, filter);

	// Get user IDs of filtered supervisors who plan to attend (for diet/gender queries)
	const filteredSupervisorIds = new Set(filteredSupervisors.map((sup) => sup.id));
	const filteredSupervisorUserIds = supervisorUsers
		.filter((su) => filteredSupervisorIds.has(su.id) && su.plansOwnAttendenceAtConference)
		.map((su) => su.userId);

	const roles = await db.customConferenceRole.findMany({
		where: {
			conferenceId
		},
		select: {
			name: true,
			fontAwesomeIcon: true,
			singleParticipant: {
				select: {
					applied: true
				}
			}
		}
	});

	const delegationsApplied = delegations.filter((d) => d.applied).length;
	const delegationsNotApplied = delegations.length - delegationsApplied;
	const delegationMembersApplied = delegations.reduce((acc, d) => {
		if (!d.applied) return acc;
		return acc + d._count.members;
	}, 0);
	const delegationMembersNotApplied =
		delegations.reduce((acc, d) => acc + d._count.members, 0) - delegationMembersApplied;
	const singleParticipantsApplied = singleParticipants.filter((sp) => sp.applied).length;
	const singleParticipantsNotApplied = singleParticipants.length - singleParticipantsApplied;
	const singleParticipantsByRole = roles.map((role) => ({
		role: role.name,
		fontAwesomeIcon: role.fontAwesomeIcon || undefined,
		total: role.singleParticipant.length,
		applied: role.singleParticipant.filter((sp) => sp.applied).length,
		notApplied: role.singleParticipant.filter((sp) => !sp.applied).length
	}));
	const totalApplied = delegationMembersApplied + singleParticipantsApplied;
	const totalNotApplied =
		delegations.reduce((acc, d) => acc + d._count.members, 0) +
		singleParticipants.length -
		totalApplied;

	const registrationStatistics = {
		total: totalApplied + totalNotApplied,
		notApplied: totalNotApplied,
		applied: totalApplied,
		delegations: {
			total: delegationsNotApplied + delegationsApplied,
			notApplied: delegationsNotApplied,
			applied: delegationsApplied
		},
		delegationMembers: {
			total: delegationMembersNotApplied + delegationMembersApplied,
			notApplied: delegationMembersNotApplied,
			applied: delegationMembersApplied
		},
		singleParticipants: {
			total: singleParticipantsNotApplied + singleParticipantsApplied,
			notApplied: singleParticipantsNotApplied,
			applied: singleParticipantsApplied,
			byRole: singleParticipantsByRole
		},
		supervisors: filteredSupervisors.length
	};

	// Supervisor statistics (not affected by filter - always shows all supervisors)
	const supervisorStatsData = (() => {
		let accepted = 0,
			rejected = 0;
		let plansAttendance = 0,
			doesNotPlanAttendance = 0;
		let acceptedAndPresent = 0,
			acceptedAndNotPresent = 0;
		let rejectedAndPresent = 0,
			rejectedAndNotPresent = 0;

		for (const sup of supervisors) {
			// Supervisor is "accepted" if any supervised participant has an assigned role
			const hasAcceptedParticipant =
				sup.supervisedDelegationMembers.some(
					(dm) => dm.delegation.assignedNationAlpha3Code || dm.delegation.assignedNonStateActorId
				) || sup.supervisedSingleParticipants.some((sp) => sp.assignedRoleId);

			// Check if supervisor plans to attend
			const plansOwn =
				supervisorUsers.find((su) => su.id === sup.id)?.plansOwnAttendenceAtConference ?? false;

			if (hasAcceptedParticipant) {
				accepted++;
				if (plansOwn) {
					plansAttendance++;
					acceptedAndPresent++;
				} else {
					doesNotPlanAttendance++;
					acceptedAndNotPresent++;
				}
			} else {
				rejected++;
				if (plansOwn) {
					plansAttendance++;
					rejectedAndPresent++;
				} else {
					doesNotPlanAttendance++;
					rejectedAndNotPresent++;
				}
			}
		}

		return {
			total: supervisors.length,
			accepted,
			rejected,
			plansAttendance,
			doesNotPlanAttendance,
			acceptedAndPresent,
			acceptedAndNotPresent,
			rejectedAndPresent,
			rejectedAndNotPresent
		};
	})();

	// Age statistics (filtered) - using dedicated service with clean database-level filtering
	const referenceDate = conference.endConference ?? conference.startConference ?? new Date();
	const ageStatistics = await getAgeStatistics({
		db,
		conferenceId,
		filter,
		referenceDate
	});

	// Diet statistics (filtered)
	// Supervisors and team members are excluded for role-based filters
	const spDietWhere = getSingleParticipantWhere(conferenceId, filter);
	const dmDietWhere = getDelegationMemberWhere(conferenceId, filter);

	const diet = {
		singleParticipants: {
			omnivore: await db.user.count({
				where: {
					singleParticipant: { some: spDietWhere },
					foodPreference: 'OMNIVORE'
				}
			}),
			vegetarian: await db.user.count({
				where: {
					singleParticipant: { some: spDietWhere },
					foodPreference: 'VEGETARIAN'
				}
			}),
			vegan: await db.user.count({
				where: {
					singleParticipant: { some: spDietWhere },
					foodPreference: 'VEGAN'
				}
			})
		},
		delegationMembers: {
			omnivore: await db.user.count({
				where: {
					delegationMemberships: { some: dmDietWhere },
					foodPreference: 'OMNIVORE'
				}
			}),
			vegetarian: await db.user.count({
				where: {
					delegationMemberships: { some: dmDietWhere },
					foodPreference: 'VEGETARIAN'
				}
			}),
			vegan: await db.user.count({
				where: {
					delegationMemberships: { some: dmDietWhere },
					foodPreference: 'VEGAN'
				}
			})
		},
		// Supervisors: filtered using same logic as registration stats
		supervisors:
			filteredSupervisorUserIds.length === 0
				? zeroDiet
				: {
						omnivore: await db.user.count({
							where: {
								id: { in: filteredSupervisorUserIds },
								foodPreference: 'OMNIVORE'
							}
						}),
						vegetarian: await db.user.count({
							where: {
								id: { in: filteredSupervisorUserIds },
								foodPreference: 'VEGETARIAN'
							}
						}),
						vegan: await db.user.count({
							where: {
								id: { in: filteredSupervisorUserIds },
								foodPreference: 'VEGAN'
							}
						})
					},
		// Team members: always counted (not affected by filter)
		teamMembers: {
			omnivore: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					foodPreference: 'OMNIVORE'
				}
			}),
			vegetarian: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					foodPreference: 'VEGETARIAN'
				}
			}),
			vegan: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					foodPreference: 'VEGAN'
				}
			})
		}
	};

	// Gender statistics (filtered)
	const gender = {
		singleParticipants: {
			male: await db.user.count({
				where: {
					singleParticipant: { some: spDietWhere },
					gender: 'MALE'
				}
			}),
			female: await db.user.count({
				where: {
					singleParticipant: { some: spDietWhere },
					gender: 'FEMALE'
				}
			}),
			diverse: await db.user.count({
				where: {
					singleParticipant: { some: spDietWhere },
					gender: 'DIVERSE'
				}
			}),
			noStatement: await db.user.count({
				where: {
					singleParticipant: { some: spDietWhere },
					gender: 'NO_STATEMENT'
				}
			})
		},
		delegationMembers: {
			male: await db.user.count({
				where: {
					delegationMemberships: { some: dmDietWhere },
					gender: 'MALE'
				}
			}),
			female: await db.user.count({
				where: {
					delegationMemberships: { some: dmDietWhere },
					gender: 'FEMALE'
				}
			}),
			diverse: await db.user.count({
				where: {
					delegationMemberships: { some: dmDietWhere },
					gender: 'DIVERSE'
				}
			}),
			noStatement: await db.user.count({
				where: {
					delegationMemberships: { some: dmDietWhere },
					gender: 'NO_STATEMENT'
				}
			})
		},
		// Supervisors: filtered using same logic as registration stats
		supervisors:
			filteredSupervisorUserIds.length === 0
				? zeroGender
				: {
						male: await db.user.count({
							where: {
								id: { in: filteredSupervisorUserIds },
								gender: 'MALE'
							}
						}),
						female: await db.user.count({
							where: {
								id: { in: filteredSupervisorUserIds },
								gender: 'FEMALE'
							}
						}),
						diverse: await db.user.count({
							where: {
								id: { in: filteredSupervisorUserIds },
								gender: 'DIVERSE'
							}
						}),
						noStatement: await db.user.count({
							where: {
								id: { in: filteredSupervisorUserIds },
								gender: 'NO_STATEMENT'
							}
						})
					},
		// Team members: always counted (not affected by filter)
		teamMembers: {
			male: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'MALE'
				}
			}),
			female: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'FEMALE'
				}
			}),
			diverse: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'DIVERSE'
				}
			}),
			noStatement: await db.user.count({
				where: {
					teamMember: {
						some: {
							conferenceId
						}
					},
					gender: 'NO_STATEMENT'
				}
			})
		}
	};

	// Status statistics (not filtered - always shows applied participants)
	const conferenceStatusStats = await db.conferenceParticipantStatus.findMany({
		where: {
			conferenceId
		},
		select: {
			userId: true,
			paymentStatus: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			didAttend: true,
			user: {
				select: {
					birthday: true
				}
			}
		}
	});

	const status = {
		paymentStatus: {
			done: conferenceStatusStats.filter((s) => s.paymentStatus === 'DONE').length,
			problem: conferenceStatusStats.filter((s) => s.paymentStatus === 'PROBLEM').length
		},
		postalStatus: {
			done: conferenceStatusStats.filter(
				(s) =>
					s.termsAndConditions === 'DONE' &&
					(ofAgeAtConference(conference.startConference, s.user.birthday) ||
						s.guardianConsent === 'DONE') &&
					s.mediaConsent === 'DONE'
			).length,
			problem: conferenceStatusStats.filter(
				(s) =>
					s.termsAndConditions === 'PROBLEM' ||
					(!ofAgeAtConference(conference.startConference, s.user.birthday) &&
						s.guardianConsent === 'PROBLEM') ||
					s.mediaConsent === 'PROBLEM'
			).length
		},
		didAttend: conferenceStatusStats.filter((s) => s.didAttend).length
	};

	// Postal/Payment Progress (not affected by filter - for participants with assigned roles)
	// Get user IDs of participants who should complete postal/payment registration
	const dmWithRoleForProgress = await db.delegationMember.findMany({
		where: {
			conferenceId,
			delegation: {
				OR: [
					{ assignedNationAlpha3Code: { not: null } },
					{ assignedNonStateActorId: { not: null } }
				]
			}
		},
		select: { userId: true }
	});

	const spWithRoleForProgress = await db.singleParticipant.findMany({
		where: {
			conferenceId,
			assignedRoleId: { not: null }
		},
		select: { userId: true }
	});

	// Supervisors planning attendance
	const supsPlanning = supervisorUsers.filter((s) => s.plansOwnAttendenceAtConference);

	// Combine all participant user IDs who need postal/payment completion
	const participantUserIdsForProgress = new Set([
		...dmWithRoleForProgress.map((d) => d.userId),
		...spWithRoleForProgress.map((s) => s.userId),
		...supsPlanning.map((s) => s.userId)
	]);
	const maxParticipants = participantUserIdsForProgress.size;

	// Filter status stats to only include participants with roles
	const relevantStatusStats = conferenceStatusStats.filter((s) =>
		participantUserIdsForProgress.has(s.userId)
	);

	// Count postal/payment status
	let postalDone = 0,
		postalPending = 0,
		postalProblem = 0;
	let paymentDone = 0,
		paymentPending = 0,
		paymentProblem = 0;

	// Completion matrix counters
	let bothComplete = 0,
		postalOnlyComplete = 0,
		paymentOnlyComplete = 0;

	for (const s of relevantStatusStats) {
		// Postal status
		const isPostalDone =
			s.termsAndConditions === 'DONE' &&
			(ofAgeAtConference(conference.startConference, s.user.birthday) ||
				s.guardianConsent === 'DONE') &&
			s.mediaConsent === 'DONE';
		const hasPostalProblem =
			s.termsAndConditions === 'PROBLEM' ||
			(!ofAgeAtConference(conference.startConference, s.user.birthday) &&
				s.guardianConsent === 'PROBLEM') ||
			s.mediaConsent === 'PROBLEM';

		if (isPostalDone) postalDone++;
		else if (hasPostalProblem) postalProblem++;
		else postalPending++;

		// Payment status
		const isPaymentDone = s.paymentStatus === 'DONE';
		if (isPaymentDone) paymentDone++;
		else if (s.paymentStatus === 'PROBLEM') paymentProblem++;
		else paymentPending++;

		// Completion matrix
		if (isPostalDone && isPaymentDone) bothComplete++;
		else if (isPostalDone && !isPaymentDone) postalOnlyComplete++;
		else if (!isPostalDone && isPaymentDone) paymentOnlyComplete++;
	}

	// Neither = participants without both postal and payment complete
	// This includes those without a ConferenceParticipantStatus record
	const neitherComplete = maxParticipants - bothComplete - postalOnlyComplete - paymentOnlyComplete;

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
		// Completion matrix
		bothComplete,
		postalOnlyComplete,
		paymentOnlyComplete,
		neitherComplete
	};

	// Addresses (filtered)
	const addresses = await db.user.groupBy({
		by: ['country', 'zip'],
		where: getUserWhere(conferenceId, filter),
		_count: {
			zip: true,
			country: true,
			_all: true
		}
	});

	// Role-based statistics (responds to filter)
	// For role-based filters, we show only the selected subset
	// For NOT_APPLIED filter, role stats are 0 (non-applied don't have roles)
	const roleBasedDelegationWhere = getDelegationWhere(conferenceId, filter);
	const roleBasedSPWhere = getSingleParticipantWhere(conferenceId, filter);

	let delegationMembersWithRole = 0;
	let delegationMembersWithoutRole = 0;
	let singleParticipantsWithRole = 0;
	let singleParticipantsWithoutRole = 0;
	let delegationsWithAssignment = 0;
	let delegationsWithoutAssignment = 0;

	if (filter === 'NOT_APPLIED') {
		// Non-applied participants don't have role assignments
		delegationMembersWithRole = 0;
		delegationMembersWithoutRole = 0;
		singleParticipantsWithRole = 0;
		singleParticipantsWithoutRole = 0;
		delegationsWithAssignment = 0;
		delegationsWithoutAssignment = 0;
	} else if (filter === 'APPLIED_WITH_ROLE') {
		// Only show those with roles
		delegationMembersWithRole = await db.delegationMember.count({
			where: {
				conferenceId,
				delegation: {
					applied: true,
					OR: [
						{ assignedNationAlpha3Code: { not: null } },
						{ assignedNonStateActorId: { not: null } }
					]
				}
			}
		});
		delegationMembersWithoutRole = 0;
		singleParticipantsWithRole = await db.singleParticipant.count({
			where: {
				conferenceId,
				applied: true,
				assignedRoleId: { not: null }
			}
		});
		singleParticipantsWithoutRole = 0;
		delegationsWithAssignment = await db.delegation.count({
			where: {
				conferenceId,
				applied: true,
				OR: [
					{ assignedNationAlpha3Code: { not: null } },
					{ assignedNonStateActorId: { not: null } }
				]
			}
		});
		delegationsWithoutAssignment = 0;
	} else if (filter === 'APPLIED_WITHOUT_ROLE') {
		// Only show those without roles
		delegationMembersWithRole = 0;
		delegationMembersWithoutRole = await db.delegationMember.count({
			where: {
				conferenceId,
				delegation: {
					applied: true,
					assignedNationAlpha3Code: null,
					assignedNonStateActorId: null
				}
			}
		});
		singleParticipantsWithRole = 0;
		singleParticipantsWithoutRole = await db.singleParticipant.count({
			where: {
				conferenceId,
				applied: true,
				assignedRoleId: null
			}
		});
		delegationsWithAssignment = 0;
		delegationsWithoutAssignment = await db.delegation.count({
			where: {
				conferenceId,
				applied: true,
				assignedNationAlpha3Code: null,
				assignedNonStateActorId: null
			}
		});
	} else {
		// ALL or APPLIED: show full breakdown
		delegationMembersWithRole = await db.delegationMember.count({
			where: {
				conferenceId,
				delegation: {
					...roleBasedDelegationWhere,
					OR: [
						{ assignedNationAlpha3Code: { not: null } },
						{ assignedNonStateActorId: { not: null } }
					]
				}
			}
		});

		delegationMembersWithoutRole = await db.delegationMember.count({
			where: {
				conferenceId,
				delegation: {
					...roleBasedDelegationWhere,
					assignedNationAlpha3Code: null,
					assignedNonStateActorId: null
				}
			}
		});

		singleParticipantsWithRole = await db.singleParticipant.count({
			where: {
				...roleBasedSPWhere,
				assignedRoleId: { not: null }
			}
		});

		singleParticipantsWithoutRole = await db.singleParticipant.count({
			where: {
				...roleBasedSPWhere,
				assignedRoleId: null
			}
		});

		delegationsWithAssignment = await db.delegation.count({
			where: {
				...roleBasedDelegationWhere,
				OR: [
					{ assignedNationAlpha3Code: { not: null } },
					{ assignedNonStateActorId: { not: null } }
				]
			}
		});

		delegationsWithoutAssignment = await db.delegation.count({
			where: {
				...roleBasedDelegationWhere,
				assignedNationAlpha3Code: null,
				assignedNonStateActorId: null
			}
		});
	}

	// Committee assignment stats - only count delegation members whose delegation has an assigned nation
	// (non-state actors do NOT get committee assignments, only nations do)
	const delegationMembersWithCommittee = await db.delegationMember.count({
		where: {
			conferenceId,
			assignedCommitteeId: { not: null },
			delegation: {
				applied: true,
				assignedNationAlpha3Code: { not: null }
			}
		}
	});

	const delegationMembersWithoutCommittee = await db.delegationMember.count({
		where: {
			conferenceId,
			assignedCommitteeId: null,
			delegation: {
				applied: true,
				assignedNationAlpha3Code: { not: null }
			}
		}
	});

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

	// Committee fill rates (always based on applied)
	const committees = await db.committee.findMany({
		where: { conferenceId },
		include: {
			nations: true,
			delegationMembers: {
				where: {
					delegation: { applied: true }
				}
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

	// Registration timeline (filtered)
	const delegationTimelineWhere = getDelegationWhere(conferenceId, filter);
	const spTimelineWhere = getSingleParticipantWhere(conferenceId, filter);

	const delegationsForTimeline = await db.delegation.findMany({
		where: delegationTimelineWhere,
		select: {
			createdAt: true,
			_count: { select: { members: true } }
		},
		orderBy: { createdAt: 'asc' }
	});

	const singleParticipantsForTimeline = await db.singleParticipant.findMany({
		where: spTimelineWhere,
		select: { createdAt: true },
		orderBy: { createdAt: 'asc' }
	});

	// Supervisors for timeline - use filtered supervisors from earlier query
	// (supervisors already have createdAt from the initial query)
	const supervisorsForTimeline = filteredSupervisors
		.map((sup) => ({ createdAt: sup.createdAt }))
		.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

	const timelineMap = new Map<
		string,
		{
			delegations: number;
			delegationMembers: number;
			singleParticipants: number;
			supervisors: number;
		}
	>();

	for (const d of delegationsForTimeline) {
		const dateKey = d.createdAt.toISOString().split('T')[0];
		const existing = timelineMap.get(dateKey) || {
			delegations: 0,
			delegationMembers: 0,
			singleParticipants: 0,
			supervisors: 0
		};
		existing.delegations += 1;
		existing.delegationMembers += d._count.members;
		timelineMap.set(dateKey, existing);
	}

	for (const sp of singleParticipantsForTimeline) {
		const dateKey = sp.createdAt.toISOString().split('T')[0];
		const existing = timelineMap.get(dateKey) || {
			delegations: 0,
			delegationMembers: 0,
			singleParticipants: 0,
			supervisors: 0
		};
		existing.singleParticipants += 1;
		timelineMap.set(dateKey, existing);
	}

	for (const sup of supervisorsForTimeline) {
		const dateKey = sup.createdAt.toISOString().split('T')[0];
		const existing = timelineMap.get(dateKey) || {
			delegations: 0,
			delegationMembers: 0,
			singleParticipants: 0,
			supervisors: 0
		};
		existing.supervisors += 1;
		timelineMap.set(dateKey, existing);
	}

	const sortedDates = Array.from(timelineMap.keys()).sort();

	// Generate all dates from first to last for a linear timeline
	const generateAllDates = (startDate: string, endDate: string): string[] => {
		const dates: string[] = [];
		const current = new Date(startDate);
		const end = new Date(endDate);

		while (current <= end) {
			dates.push(current.toISOString().split('T')[0]);
			current.setDate(current.getDate() + 1);
		}

		return dates;
	};

	let registrationTimeline: {
		date: string;
		cumulativeDelegations: number;
		cumulativeDelegationMembers: number;
		cumulativeSingleParticipants: number;
		cumulativeSupervisors: number;
	}[] = [];

	if (sortedDates.length > 0) {
		const allDates = generateAllDates(sortedDates[0], sortedDates[sortedDates.length - 1]);

		let cumulativeDelegations = 0;
		let cumulativeDelegationMembers = 0;
		let cumulativeSingleParticipants = 0;
		let cumulativeSupervisors = 0;

		registrationTimeline = allDates.map((date) => {
			const data = timelineMap.get(date);
			if (data) {
				cumulativeDelegations += data.delegations;
				cumulativeDelegationMembers += data.delegationMembers;
				cumulativeSingleParticipants += data.singleParticipants;
				cumulativeSupervisors += data.supervisors;
			}
			return {
				date,
				cumulativeDelegations,
				cumulativeDelegationMembers,
				cumulativeSingleParticipants,
				cumulativeSupervisors
			};
		});
	}

	// Nationality distribution (filtered)
	const nationalityData = await db.user.groupBy({
		by: ['country'],
		where: getUserWhere(conferenceId, filter),
		_count: { country: true }
	});

	const nationalityDistribution = nationalityData.map((n) => ({
		country: n.country || 'Unknown',
		countryCode: n.country || '',
		count: n._count.country
	}));

	// School statistics (filtered)
	const delegationSchoolsWhere = getDelegationWhere(conferenceId, filter);

	const delegationSchools = await db.delegation.groupBy({
		by: ['school'],
		where: delegationSchoolsWhere,
		_count: { school: true }
	});

	const delegationsWithMembers = await db.delegation.findMany({
		where: delegationSchoolsWhere,
		select: {
			school: true,
			_count: { select: { members: true } }
		}
	});

	const schoolMap = new Map<string, { delegationCount: number; memberCount: number }>();

	for (const d of delegationSchools) {
		const schoolName = d.school || 'Unknown';
		schoolMap.set(schoolName, {
			delegationCount: d._count.school,
			memberCount: 0
		});
	}

	for (const d of delegationsWithMembers) {
		const schoolName = d.school || 'Unknown';
		const existing = schoolMap.get(schoolName);
		if (existing) {
			existing.memberCount += d._count.members;
		}
	}

	const schoolStats = Array.from(schoolMap.entries())
		.map(([school, data]) => ({
			school,
			delegationCount: data.delegationCount,
			memberCount: data.memberCount
		}))
		.sort((a, b) => b.memberCount - a.memberCount);

	// Waiting list statistics (not affected by filter)
	const waitingListTotal = await db.waitingListEntry.count({
		where: { conferenceId }
	});

	const waitingListVisible = await db.waitingListEntry.count({
		where: { conferenceId, hidden: false }
	});

	const waitingListAssigned = await db.waitingListEntry.count({
		where: { conferenceId, assigned: true }
	});

	const waitingList = {
		total: waitingListTotal,
		visible: waitingListVisible,
		hidden: waitingListTotal - waitingListVisible,
		assigned: waitingListAssigned,
		unassigned: waitingListTotal - waitingListAssigned
	};

	// Paper statistics (not affected by filter - shows all papers)
	const papers = await db.paper.findMany({
		where: { conferenceId },
		select: {
			id: true,
			type: true,
			status: true,
			agendaItemId: true,
			versions: {
				select: {
					reviews: { select: { id: true } }
				}
			}
		}
	});

	// Count by type
	const papersByType = {
		positionPaper: papers.filter((p) => p.type === 'POSITION_PAPER').length,
		workingPaper: papers.filter((p) => p.type === 'WORKING_PAPER').length,
		introductionPaper: papers.filter((p) => p.type === 'INTRODUCTION_PAPER').length
	};

	// Count by status
	const papersByStatus = {
		draft: papers.filter((p) => p.status === 'DRAFT').length,
		submitted: papers.filter((p) => p.status === 'SUBMITTED').length,
		changesRequested: papers.filter((p) => p.status === 'CHANGES_REQUESTED').length,
		accepted: papers.filter((p) => p.status === 'ACCEPTED').length
	};

	// Papers with/without reviews
	const papersWithReviews = papers.filter((p) =>
		p.versions.some((v) => v.reviews.length > 0)
	).length;

	// Papers per committee (via agenda items)
	const agendaItemIds = papers.map((p) => p.agendaItemId).filter((id): id is string => id !== null);

	const agendaItemCommittees =
		agendaItemIds.length > 0
			? await db.committeeAgendaItem.findMany({
					where: {
						id: { in: agendaItemIds }
					},
					select: {
						id: true,
						committee: { select: { id: true, name: true, abbreviation: true } }
					}
				})
			: [];

	// Aggregate by committee
	const committeeMap = new Map<string, { name: string; abbreviation: string; count: number }>();
	for (const paper of papers) {
		if (paper.agendaItemId) {
			const agendaItem = agendaItemCommittees.find((ai) => ai.id === paper.agendaItemId);
			if (agendaItem?.committee) {
				const existing = committeeMap.get(agendaItem.committee.id);
				if (existing) {
					existing.count += 1;
				} else {
					committeeMap.set(agendaItem.committee.id, {
						name: agendaItem.committee.name,
						abbreviation: agendaItem.committee.abbreviation,
						count: 1
					});
				}
			}
		}
	}

	const paperStats = {
		total: papers.length,
		byType: papersByType,
		byStatus: papersByStatus,
		withReviews: papersWithReviews,
		withoutReviews: papers.length - papersWithReviews,
		byCommittee: Array.from(committeeMap.entries()).map(([id, data]) => ({
			committeeId: id,
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
		supervisorStats: supervisorStatsData,
		postalPaymentProgress,
		paperStats
	};
}
