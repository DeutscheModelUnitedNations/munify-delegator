// const user = permissions.mustBeLoggedIn();
// 			const conferenceId = params.id;

import { builder } from '../builder';

// 			await requireToBeConferenceAdmin({ conferenceId, user });

// 			const { countdowns, registrationStatistics, ageStatistics } = await conferenceStats({
// 				db,
// 				conferenceId
// 			});

// 			return {
// 				countdowns,
// 				registered: registrationStatistics,
// 				age: ageStatistics
// 			};

const statisticsResult = builder.simpleObject('StatisticsResult', {
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
								applied: t.int(),
								withSupervisor: t.int()
							})
						})
					}),
					singleParticipants: t.field({
						type: builder.simpleObject('StatisticsResultRegisteredSingleParticipants', {
							fields: (t) => ({
								total: t.int(),
								notApplied: t.int(),
								applied: t.int()
							})
						})
					})
				})
			})
		})
	})
});

// 	registered: {
// 		singleParticipants: {
// 			total: number;
// 			notApplied: number;
// 			applied: number;
// 			byRole: {
// 				role: string;
// 				fontAwesomeIcon: string | undefined;
// 				total: number;
// 				notApplied: number;
// 				applied: number;
// 			}[];
// 		};
// 		supervisors: number;
// 		age: {
// 			average: number;
// 			distribution: Record<string, number>;
// 		};
// 	};
// }>('PlausibilityResult')
// .implement({
// 	fields: (t) => ({
// 		countdowns: t.expose('countdowns', {
// 			type: t.
// 		})
// 	})
// });
