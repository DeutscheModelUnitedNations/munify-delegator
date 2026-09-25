import { schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageConference,
	userId
} from '$api/services/authHelper';
import { conferenceStats } from '$api/services/statistics';

const StatsFilterEnum = schemaBuilder.enumType('StatsFilter', {
	values: ['ALL', 'APPLIED', 'NOT_APPLIED', 'APPLIED_WITH_ROLE', 'APPLIED_WITHOUT_ROLE'] as const
});

const dietVariations = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredParticipantDietVariations',
	{
		fields: (t) => ({
			omnivore: t.int(),
			vegetarian: t.int(),
			vegan: t.int()
		})
	}
);

const genderVariations = schemaBuilder.simpleObject(
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

const roleBasedStats = schemaBuilder.simpleObject('StatisticsResultRoleBased', {
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

const committeeFillRate = schemaBuilder.simpleObject('StatisticsResultCommitteeFillRate', {
	fields: (t) => ({
		committeeId: t.id(),
		name: t.string(),
		abbreviation: t.string(),
		totalSeats: t.int(),
		assignedSeats: t.int(),
		fillPercentage: t.int()
	})
});

const registrationTimelineEntry = schemaBuilder.simpleObject(
	'StatisticsResultRegistrationTimeline',
	{
		fields: (t) => ({
			date: t.string(),
			cumulativeDelegations: t.int(),
			cumulativeDelegationMembers: t.int(),
			cumulativeSingleParticipants: t.int(),
			cumulativeSupervisors: t.int()
		})
	}
);

const nationalityStats = schemaBuilder.simpleObject('StatisticsResultNationality', {
	fields: (t) => ({
		country: t.string(),
		countryCode: t.string(),
		count: t.int()
	})
});

const schoolStats = schemaBuilder.simpleObject('StatisticsResultSchool', {
	fields: (t) => ({
		school: t.string(),
		delegationCount: t.int(),
		memberCount: t.int()
	})
});

const waitingListStats = schemaBuilder.simpleObject('StatisticsResultWaitingList', {
	fields: (t) => ({
		total: t.int(),
		visible: t.int(),
		hidden: t.int(),
		assigned: t.int(),
		unassigned: t.int()
	})
});

const supervisorStatsType = schemaBuilder.simpleObject('StatisticsResultSupervisorStats', {
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

const postalPaymentProgressType = schemaBuilder.simpleObject(
	'StatisticsResultPostalPaymentProgress',
	{
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
			bothComplete: t.int(),
			postalOnlyComplete: t.int(),
			paymentOnlyComplete: t.int(),
			neitherComplete: t.int()
		})
	}
);

const papersByTypeStats = schemaBuilder.simpleObject('StatisticsResultPapersByType', {
	fields: (t) => ({
		positionPaper: t.int(),
		workingPaper: t.int(),
		introductionPaper: t.int()
	})
});

const papersByStatusStats = schemaBuilder.simpleObject('StatisticsResultPapersByStatus', {
	fields: (t) => ({
		draft: t.int(),
		submitted: t.int(),
		changesRequested: t.int(),
		accepted: t.int()
	})
});

const papersByCommitteeStats = schemaBuilder.simpleObject('StatisticsResultPapersByCommittee', {
	fields: (t) => ({
		committeeId: t.string(),
		name: t.string(),
		abbreviation: t.string(),
		count: t.int()
	})
});

const paperStatsType = schemaBuilder.simpleObject('StatisticsResultPaperStats', {
	fields: (t) => ({
		total: t.int(),
		byType: t.field({ type: papersByTypeStats }),
		byStatus: t.field({ type: papersByStatusStats }),
		withReviews: t.int(),
		withoutReviews: t.int(),
		byCommittee: t.field({ type: [papersByCommitteeStats] })
	})
});

const ageCategoryBreakdown = schemaBuilder.simpleObject('StatisticsResultAgeCategoryBreakdown', {
	fields: (t) => ({
		categoryId: t.string(),
		count: t.int()
	})
});

const ageDistributionEntry = schemaBuilder.simpleObject('StatisticsResultAgeDistributionEntry', {
	fields: (t) => ({
		age: t.int(),
		count: t.int(),
		byCategory: t.field({ type: [ageCategoryBreakdown] })
	})
});

const ageCategoryStats = schemaBuilder.simpleObject('StatisticsResultAgeCategoryStats', {
	fields: (t) => ({
		categoryId: t.string(),
		categoryName: t.string(),
		/** Either `delegationMember` or `singleParticipant`. */
		categoryType: t.string(),
		count: t.int(),
		average: t.float({ nullable: true })
	})
});

const ageCommitteeStats = schemaBuilder.simpleObject('StatisticsResultAgeCommitteeStats', {
	fields: (t) => ({
		committeeId: t.string(),
		committeeName: t.string(),
		abbreviation: t.string(),
		count: t.int(),
		average: t.float({ nullable: true })
	})
});

const ageOverall = schemaBuilder.simpleObject('StatisticsResultAgeOverall', {
	fields: (t) => ({
		average: t.float({ nullable: true }),
		total: t.int(),
		missingBirthdays: t.int()
	})
});

const ageStatsType = schemaBuilder.simpleObject('StatisticsResultAge', {
	fields: (t) => ({
		overall: t.field({ type: ageOverall }),
		distribution: t.field({ type: [ageDistributionEntry] }),
		byCategory: t.field({ type: [ageCategoryStats] }),
		byCommittee: t.field({ type: [ageCommitteeStats] })
	})
});

const countdownsType = schemaBuilder.simpleObject('StatisticsResultCountdowns', {
	fields: (t) => ({
		daysUntilConference: t.int(),
		daysUntilEndRegistration: t.int()
	})
});

const registeredDelegations = schemaBuilder.simpleObject('StatisticsResultRegisteredDelegations', {
	fields: (t) => ({
		total: t.int(),
		notApplied: t.int(),
		applied: t.int()
	})
});

const registeredDelegationMembers = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredDelegationMembers',
	{
		fields: (t) => ({
			total: t.int(),
			notApplied: t.int(),
			applied: t.int()
		})
	}
);

const registeredSingleParticipantsByRole = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredSingleParticipantsByRole',
	{
		fields: (t) => ({
			role: t.string(),
			fontAwesomeIcon: t.string({ nullable: true }),
			total: t.int(),
			notApplied: t.int(),
			applied: t.int()
		})
	}
);

const registeredSingleParticipants = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredSingleParticipants',
	{
		fields: (t) => ({
			total: t.int(),
			notApplied: t.int(),
			applied: t.int(),
			byRole: t.field({ type: [registeredSingleParticipantsByRole] })
		})
	}
);

const registeredType = schemaBuilder.simpleObject('StatisticsResultRegistered', {
	fields: (t) => ({
		total: t.int(),
		notApplied: t.int(),
		applied: t.int(),
		delegations: t.field({ type: registeredDelegations }),
		delegationMembers: t.field({ type: registeredDelegationMembers }),
		singleParticipants: t.field({ type: registeredSingleParticipants }),
		supervisors: t.int()
	})
});

const dietType = schemaBuilder.simpleObject('StatisticsResultRegisteredParticipantDiet', {
	fields: (t) => ({
		singleParticipants: t.field({ type: dietVariations }),
		delegationMembers: t.field({ type: dietVariations }),
		supervisors: t.field({ type: dietVariations }),
		teamMembers: t.field({ type: dietVariations })
	})
});

const genderType = schemaBuilder.simpleObject('StatisticsResultRegisteredParticipantGender', {
	fields: (t) => ({
		singleParticipants: t.field({ type: genderVariations }),
		delegationMembers: t.field({ type: genderVariations }),
		supervisors: t.field({ type: genderVariations }),
		teamMembers: t.field({ type: genderVariations })
	})
});

const postalRegistrationStatus = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredParticipantStatusPostalRegistration',
	{
		fields: (t) => ({
			done: t.int(),
			problem: t.int()
		})
	}
);

const paymentRegistrationStatus = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredParticipantStatusPayment',
	{
		fields: (t) => ({
			done: t.int(),
			problem: t.int()
		})
	}
);

const statusType = schemaBuilder.simpleObject('StatisticsResultRegisteredParticipantStatus', {
	fields: (t) => ({
		postalStatus: t.field({ type: postalRegistrationStatus }),
		paymentStatus: t.field({ type: paymentRegistrationStatus }),
		didAttend: t.int()
	})
});

const addressesCount = schemaBuilder.simpleObject('StatisticsResultAddressesCount', {
	fields: (t) => ({
		country: t.int(),
		zip: t.int(),
		_all: t.int()
	})
});

const addressesType = schemaBuilder.simpleObject('StatisticsResultAddresses', {
	fields: (t) => ({
		_count: t.field({ type: addressesCount }),
		country: t.string({ nullable: true }),
		zip: t.string({ nullable: true })
	})
});

const StatisticsResult = schemaBuilder.simpleObject('StatisticsResult', {
	fields: (t) => ({
		countdowns: t.field({ type: countdownsType }),
		registered: t.field({ type: registeredType }),
		age: t.field({ type: ageStatsType }),
		diet: t.field({ type: dietType }),
		gender: t.field({ type: genderType }),
		status: t.field({ type: statusType }),
		addresses: t.field({ type: [addressesType] }),
		roleBased: t.field({ type: roleBasedStats }),
		committeeFillRates: t.field({ type: [committeeFillRate] }),
		registrationTimeline: t.field({ type: [registrationTimelineEntry] }),
		nationalityDistribution: t.field({ type: [nationalityStats] }),
		schoolStats: t.field({ type: [schoolStats] }),
		waitingList: t.field({ type: waitingListStats }),
		supervisorStats: t.field({ type: supervisorStatsType }),
		postalPaymentProgress: t.field({ type: postalPaymentProgressType }),
		paperStats: t.field({ type: paperStatsType })
	})
});

schemaBuilder.queryFields((t) => ({
	getConferenceStatistics: t.field({
		type: StatisticsResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			filter: t.arg({ type: StatsFilterEnum, defaultValue: 'ALL' })
		},
		resolve: async (_root, args, ctx) => {
			await assertMayManageConference(args.conferenceId, userId(ctx), PARTICIPANT_CARE_ROLES, {
				allowSystemAdmin: true,
				ctx
			});

			const stats = await conferenceStats({
				conferenceId: args.conferenceId,
				filter: args.filter ?? 'ALL'
			});

			return {
				...stats,
				registered: stats.registrationStatistics,
				age: stats.ageStatistics
			};
		}
	})
}));
