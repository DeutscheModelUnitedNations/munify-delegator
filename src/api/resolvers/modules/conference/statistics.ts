import { requireToBeConferenceAdmin } from '$api/services/requireUserToBeConferenceAdmin';
import { conferenceStats } from '$api/services/stats';
import { db } from '$db/db';
import { builder } from '../../builder';

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
								applied: t.int(),
								withSupervisor: t.int()
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
			type: builder.simpleObject('StatisticsResultRegisteredAge', {
				fields: (t) => ({
					average: t.float(),
					distribution: t.field({
						type: [
							builder.simpleObject('StatisticsResultRegisteredAgeDistribution', {
								fields: (t) => ({
									key: t.string(),
									value: t.float()
								})
							})
						]
					})
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
		})
	})
});

builder.queryFields((t) => {
	return {
		getConferenceStatistics: t.field({
			type: StatisticsResult,
			args: {
				conferenceId: t.arg.id()
			},
			resolve: async (root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				await requireToBeConferenceAdmin({ conferenceId: args.conferenceId, user });

				const { countdowns, registrationStatistics, ageStatistics, diet, gender } =
					await conferenceStats({
						db,
						conferenceId: args.conferenceId
					});

				return {
					countdowns,
					diet,
					gender,
					registered: registrationStatistics,
					age: {
						...ageStatistics,
						distribution: Object.entries(ageStatistics.distribution).map(([k, v]) => ({
							key: k,
							value: v
						}))
					}
				};
			}
		})
	};
});
