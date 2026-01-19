import { requireToBeConferenceAdmin } from '$api/services/requireUserToBeConferenceAdmin';
import { conferenceStats, type StatsFilterType } from '$api/services/stats';
import { db } from '$db/db';
import { builder } from '../../builder';

// Stats filter enum for filtering statistics by registration/role status
const StatsFilterEnum = builder.enumType('StatsFilter', {
	values: ['ALL', 'APPLIED', 'NOT_APPLIED', 'APPLIED_WITH_ROLE', 'APPLIED_WITHOUT_ROLE'] as const
});

const dietVariations = builder.simpleObject('StatisticsResultRegisteredParticipantDietVariations', {
	fields: (t) => ({
		omnivore: t.int(),
		vegetarian: t.int(),
		vegan: t.int()
	})
});

const genderVariations = builder.simpleObject(
	'StatisticsResultRegisteredParticipantGenderVariations',
	{
		fields: (t) => ({
			male: t.int(),
			female: t.int(),
			diverse: t.int(),
			noStatement: t.int()
		})
	}
);

// New types for role-based statistics
const roleBasedStats = builder.simpleObject('StatisticsResultRoleBased', {
	fields: (t) => ({
		delegationMembersWithRole: t.int(),
		delegationMembersWithoutRole: t.int(),
		delegationMembersWithCommittee: t.int(),
		delegationMembersWithoutCommittee: t.int(),
		singleParticipantsWithRole: t.int(),
		singleParticipantsWithoutRole: t.int(),
		delegationsWithAssignment: t.int(),
		delegationsWithoutAssignment: t.int()
	})
});

// Committee fill rates
const committeeFillRate = builder.simpleObject('StatisticsResultCommitteeFillRate', {
	fields: (t) => ({
		committeeId: t.id(),
		name: t.string(),
		abbreviation: t.string(),
		totalSeats: t.int(),
		assignedSeats: t.int(),
		fillPercentage: t.int()
	})
});

// Registration timeline
const registrationTimelineEntry = builder.simpleObject('StatisticsResultRegistrationTimeline', {
	fields: (t) => ({
		date: t.string(),
		cumulativeDelegations: t.int(),
		cumulativeDelegationMembers: t.int(),
		cumulativeSingleParticipants: t.int(),
		cumulativeSupervisors: t.int()
	})
});

// Nationality distribution
const nationalityStats = builder.simpleObject('StatisticsResultNationality', {
	fields: (t) => ({
		country: t.string(),
		countryCode: t.string(),
		count: t.int()
	})
});

// School statistics
const schoolStats = builder.simpleObject('StatisticsResultSchool', {
	fields: (t) => ({
		school: t.string(),
		delegationCount: t.int(),
		memberCount: t.int()
	})
});

// Waiting list statistics
const waitingListStats = builder.simpleObject('StatisticsResultWaitingList', {
	fields: (t) => ({
		total: t.int(),
		visible: t.int(),
		hidden: t.int(),
		assigned: t.int(),
		unassigned: t.int()
	})
});

// Supervisor statistics
const supervisorStatsType = builder.simpleObject('StatisticsResultSupervisorStats', {
	fields: (t) => ({
		total: t.int(),
		accepted: t.int(),
		rejected: t.int(),
		plansAttendance: t.int(),
		doesNotPlanAttendance: t.int(),
		acceptedAndPresent: t.int(),
		acceptedAndNotPresent: t.int(),
		rejectedAndPresent: t.int(),
		rejectedAndNotPresent: t.int()
	})
});

// Postal/Payment progress statistics
const postalPaymentProgressType = builder.simpleObject('StatisticsResultPostalPaymentProgress', {
	fields: (t) => ({
		maxParticipants: t.int(),
		postalDone: t.int(),
		postalPending: t.int(),
		postalProblem: t.int(),
		postalPercentage: t.int(),
		paymentDone: t.int(),
		paymentPending: t.int(),
		paymentProblem: t.int(),
		paymentPercentage: t.int(),
		// Completion matrix
		bothComplete: t.int(),
		postalOnlyComplete: t.int(),
		paymentOnlyComplete: t.int(),
		neitherComplete: t.int()
	})
});

// Paper statistics by type
const papersByTypeStats = builder.simpleObject('StatisticsResultPapersByType', {
	fields: (t) => ({
		positionPaper: t.int(),
		workingPaper: t.int(),
		introductionPaper: t.int()
	})
});

// Paper statistics by status
const papersByStatusStats = builder.simpleObject('StatisticsResultPapersByStatus', {
	fields: (t) => ({
		draft: t.int(),
		submitted: t.int(),
		changesRequested: t.int(),
		accepted: t.int()
	})
});

// Papers by committee
const papersByCommitteeStats = builder.simpleObject('StatisticsResultPapersByCommittee', {
	fields: (t) => ({
		committeeId: t.string(),
		name: t.string(),
		abbreviation: t.string(),
		count: t.int()
	})
});

// Main paper statistics type
const paperStatsType = builder.simpleObject('StatisticsResultPaperStats', {
	fields: (t) => ({
		total: t.int(),
		byType: t.field({ type: papersByTypeStats }),
		byStatus: t.field({ type: papersByStatusStats }),
		withReviews: t.int(),
		withoutReviews: t.int(),
		byCommittee: t.field({ type: [papersByCommitteeStats] })
	})
});

// Age statistics - new clean types
const ageCategoryBreakdown = builder.simpleObject('StatisticsResultAgeCategoryBreakdown', {
	fields: (t) => ({
		categoryId: t.string(),
		count: t.int()
	})
});

const ageDistributionEntry = builder.simpleObject('StatisticsResultAgeDistributionEntry', {
	fields: (t) => ({
		age: t.int(),
		count: t.int(),
		byCategory: t.field({ type: [ageCategoryBreakdown] })
	})
});

const ageCategoryStats = builder.simpleObject('StatisticsResultAgeCategoryStats', {
	fields: (t) => ({
		categoryId: t.string(),
		categoryName: t.string(),
		categoryType: t.string(), // 'delegationMember' | 'singleParticipant'
		count: t.int(),
		average: t.float({ nullable: true })
	})
});

const ageCommitteeStats = builder.simpleObject('StatisticsResultAgeCommitteeStats', {
	fields: (t) => ({
		committeeId: t.string(),
		committeeName: t.string(),
		abbreviation: t.string(),
		count: t.int(),
		average: t.float({ nullable: true })
	})
});

const ageOverall = builder.simpleObject('StatisticsResultAgeOverall', {
	fields: (t) => ({
		average: t.float({ nullable: true }),
		total: t.int(),
		missingBirthdays: t.int()
	})
});

const StatisticsResult = builder.simpleObject('StatisticsResult', {
	fields: (t) => ({
		countdowns: t.field({
			type: builder.simpleObject('StatisticsResultCountdowns', {
				fields: (t) => ({
					daysUntilConference: t.int(),
					daysUntilEndRegistration: t.int()
				})
			})
		}),
		registered: t.field({
			type: builder.simpleObject('StatisticsResultRegistered', {
				fields: (t) => ({
					total: t.int(),
					notApplied: t.int(),
					applied: t.int(),
					delegations: t.field({
						type: builder.simpleObject('StatisticsResultRegisteredDelegations', {
							fields: (t) => ({
								total: t.int(),
								notApplied: t.int(),
								applied: t.int()
							})
						})
					}),
					delegationMembers: t.field({
						type: builder.simpleObject('StatisticsResultRegisteredDelegationMembers', {
							fields: (t) => ({
								total: t.int(),
								notApplied: t.int(),
								applied: t.int()
								// withSupervisor: t.int()
							})
						})
					}),
					singleParticipants: t.field({
						type: builder.simpleObject('StatisticsResultRegisteredSingleParticipants', {
							fields: (t) => ({
								total: t.int(),
								notApplied: t.int(),
								applied: t.int(),
								byRole: t.field({
									type: [
										t.builder.simpleObject('StatisticsResultRegisteredSingleParticipantsByRole', {
											fields: (t) => ({
												role: t.string(),
												fontAwesomeIcon: t.string({ nullable: true }),
												total: t.int(),
												notApplied: t.int(),
												applied: t.int()
											})
										})
									]
								})
							})
						})
					}),
					supervisors: t.int()
				})
			})
		}),
		age: t.field({
			type: builder.simpleObject('StatisticsResultAge', {
				fields: (t) => ({
					overall: t.field({ type: ageOverall }),
					distribution: t.field({ type: [ageDistributionEntry] }),
					byCategory: t.field({ type: [ageCategoryStats] }),
					byCommittee: t.field({ type: [ageCommitteeStats] })
				})
			})
		}),
		diet: t.field({
			type: t.builder.simpleObject('StatisticsResultRegisteredParticipantDiet', {
				fields: (t) => ({
					singleParticipants: t.field({
						type: dietVariations
					}),
					delegationMembers: t.field({
						type: dietVariations
					}),
					supervisors: t.field({
						type: dietVariations
					}),
					teamMembers: t.field({
						type: dietVariations
					})
				})
			})
		}),
		gender: t.field({
			type: t.builder.simpleObject('StatisticsResultRegisteredParticipantGender', {
				fields: (t) => ({
					singleParticipants: t.field({
						type: genderVariations
					}),
					delegationMembers: t.field({
						type: genderVariations
					}),
					supervisors: t.field({
						type: genderVariations
					}),
					teamMembers: t.field({
						type: genderVariations
					})
				})
			})
		}),
		status: t.field({
			type: t.builder.simpleObject('StatisticsResultRegisteredParticipantStatus', {
				fields: (t) => ({
					postalStatus: t.field({
						type: t.builder.simpleObject(
							'StatisticsResultRegisteredParticipantStatusPostalRegistration',
							{
								fields: (t) => ({
									done: t.int(),
									problem: t.int()
								})
							}
						)
					}),
					paymentStatus: t.field({
						type: t.builder.simpleObject('StatisticsResultRegisteredParticipantStatusPayment', {
							fields: (t) => ({
								done: t.int(),
								problem: t.int()
							})
						})
					}),
					didAttend: t.int()
				})
			})
		}),
		addresses: t.field({
			type: [
				t.builder
					.objectRef<{
						country: string | null;
						zip: string | null;
						_count: { zip: number; country: number; _all: number };
					}>('StatisticsResultAddresses')
					.implement({
						fields: (t) => ({
							_count: t.field({
								resolve: (parent) => parent._count,
								type: t.builder
									.objectRef<{
										zip: number;
										country: number;
										_all: number;
									}>('StatisticsResultAddressesCount')
									.implement({
										fields: (t) => ({
											country: t.exposeInt('country'),
											zip: t.exposeInt('zip'),
											_all: t.exposeInt('_all')
										})
									})
							}),
							country: t.exposeString('country', { nullable: true }),
							zip: t.exposeString('zip', { nullable: true })
						})
					})
			]
		}),
		roleBased: t.field({
			type: roleBasedStats
		}),
		committeeFillRates: t.field({
			type: [committeeFillRate]
		}),
		registrationTimeline: t.field({
			type: [registrationTimelineEntry]
		}),
		nationalityDistribution: t.field({
			type: [nationalityStats]
		}),
		schoolStats: t.field({
			type: [schoolStats]
		}),
		waitingList: t.field({
			type: waitingListStats
		}),
		supervisorStats: t.field({
			type: supervisorStatsType
		}),
		postalPaymentProgress: t.field({
			type: postalPaymentProgressType
		}),
		paperStats: t.field({
			type: paperStatsType
		})
	})
});

builder.queryFields((t) => {
	return {
		getConferenceStatistics: t.field({
			type: StatisticsResult,
			args: {
				conferenceId: t.arg.id(),
				filter: t.arg({ type: StatsFilterEnum, defaultValue: 'ALL' })
			},
			resolve: async (root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				await requireToBeConferenceAdmin({ conferenceId: args.conferenceId, user });

				const {
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
				} = await conferenceStats({
					db,
					conferenceId: args.conferenceId,
					filter: args.filter as StatsFilterType
				});

				return {
					countdowns,
					diet,
					gender,
					registered: registrationStatistics,
					age: ageStatistics,
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
		})
	};
});
