import { requireToBeConferenceAdmin } from '$api/services/requireUserToBeConferenceAdmin';
import { conferenceStats } from '$api/services/stats';
import { db } from '$db/db';
import { builder } from '../../builder';

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

				const { countdowns, registrationStatistics, ageStatistics } = await conferenceStats({
					db,
					conferenceId: args.conferenceId
				});

				return {
					countdowns,
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
