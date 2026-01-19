import { builder } from '../builder';
import {
	UserEmailFieldObject,
	UserIdFieldObject,
	UserFamily_nameFieldObject,
	deleteOneUserMutationObject,
	findManyUserQueryObject,
	findUniqueUserQueryObject,
	updateOneUserMutationObject,
	UserBirthdayFieldObject,
	UserGiven_nameFieldObject,
	UserLocaleFieldObject,
	UserPhoneFieldObject,
	UserPreferred_usernameFieldObject,
	UserStreetFieldObject,
	UserApartmentFieldObject,
	UserZipFieldObject,
	UserCityFieldObject,
	UserCountryFieldObject,
	UserGenderFieldObject,
	UserPronounsFieldObject,
	UserFoodPreferenceFieldObject,
	UserWantsToReceiveGeneralInformationFieldObject,
	UserWantsJoinTeamInformationFieldObject,
	UserPapersFieldObject,
	UserPaperReviewsFieldObject,
	UserGlobalNotesFieldObject,
	UserEmergencyContactsFieldObject
} from '$db/generated/graphql/User';
import { fetchUserInfoFromIssuer } from '$api/services/OIDC';
import { db } from '$db/db';
import { configPublic } from '$config/public';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { GraphQLError } from 'graphql';
import { Gender } from '$db/generated/graphql/inputs';

export const GQLUser = builder.prismaObject('User', {
	fields: (t) => ({
		id: t.field(UserIdFieldObject),
		email: t.field(UserEmailFieldObject),
		family_name: t.field(UserFamily_nameFieldObject),
		given_name: t.field(UserGiven_nameFieldObject),
		locale: t.field(UserLocaleFieldObject),
		preferred_username: t.field(UserPreferred_usernameFieldObject),
		birthday: t.field(UserBirthdayFieldObject),
		phone: t.field(UserPhoneFieldObject),
		street: t.field(UserStreetFieldObject),
		apartment: t.field(UserApartmentFieldObject),
		zip: t.field(UserZipFieldObject),
		city: t.field(UserCityFieldObject),
		country: t.field(UserCountryFieldObject),
		gender: t.field(UserGenderFieldObject),
		pronouns: t.field(UserPronounsFieldObject),
		foodPreference: t.field(UserFoodPreferenceFieldObject),
		emergencyContacts: t.field(UserEmergencyContactsFieldObject),
		wantsToReceiveGeneralInformation: t.field(UserWantsToReceiveGeneralInformationFieldObject),
		wantsJoinTeamInformation: t.field(UserWantsJoinTeamInformationFieldObject),
		globalNotes: t.field(UserGlobalNotesFieldObject),
		papers: t.relation('papers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Paper
			})
		}),
		paperReviews: t.relation('paperReviews', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').PaperReview
			})
		}),
		delegationMemberships: t.relation('delegationMemberships', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		}),
		conferenceSupervisor: t.relation('conferenceSupervisor', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceSupervisor
			})
		}),
		conferenceParticipantStatus: t.relation('conferenceParticipantStatus', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceParticipantStatus
			})
		}),
		teamMember: t.relation('teamMember', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').TeamMember
			})
		}),
		singleParticipant: t.relation('singleParticipant', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SingleParticipant
			})
		}),
		surveyAnswers: t.relation('surveyAnswers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SurveyAnswer
			})
		}),
		conferenceParticipationsCount: t.field({
			type: 'Int',
			resolve: async (parent, args, ctx, info) => {
				const delegationMembershipsCount = await db.delegationMember.count({
					where: {
						userId: parent.id,
						delegation: {
							OR: [
								{ assignedNationAlpha3Code: { not: null } },
								{ assignedNonStateActorId: { not: null } }
							]
						}
					}
				});

				const singleParticipantsCount = await db.singleParticipant.count({
					where: {
						userId: parent.id,
						assignedRoleId: { not: null }
					}
				});

				const conferenceSupervisorsCount = await db.conferenceSupervisor.count({
					where: {
						userId: parent.id
					}
				});

				return delegationMembershipsCount + singleParticipantsCount + conferenceSupervisorsCount;
			}
		})
	})
});

builder.queryFields((t) => {
	const field = findManyUserQueryObject(t);
	return {
		findManyUsers: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').User]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueUserQueryObject(t);
	return {
		findUniqueUser: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').User]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	return {
		previewUserByIdOrEmail: t.field({
			type: t.builder.simpleObject('UserPreview', {
				fields: (t) => ({
					id: t.id(),
					email: t.string(),
					given_name: t.string(),
					family_name: t.string()
				})
			}),
			args: {
				emailOrId: t.arg.string()
			},
			resolve: async (root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				const dbUser = await db.user.findUnique({
					where: {
						id: user.sub,
						teamMember: {
							some: {
								role: {
									in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
								}
							}
						}
					}
				});

				if (!dbUser && !user.hasRole('admin')) {
					throw new GraphQLError(
						'You are not allowed to preview users. You need to be a team member with the role PARTICIPANT_CARE or PROJECT_MANAGEMENT or an admin.'
					);
				}

				return await db.user.findFirstOrThrow({
					where: {
						OR: [{ id: args.emailOrId }, { email: args.emailOrId }]
					}
				});
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneUserMutationObject(t);
// 	return {
// 		createOneUser: t.prismaField({
// 			...field,

// 			resolve: async (query, root, args, ctx, info) => {
// 				//TODO check permissions

// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

builder.mutationFields((t) => {
	const field = updateOneUserMutationObject(t);
	return {
		updateOneUser: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				data: t.arg({
					type: t.builder.inputType('UserUpdateDataInput', {
						fields: (t) => ({
							given_name: t.string(),
							family_name: t.string(),
							birthday: t.field({ type: 'DateTime' }),
							phone: t.string(),
							street: t.string(),
							apartment: t.string({ required: false }),
							zip: t.string(),
							city: t.string(),
							country: t.string(),
							gender: t.field({ type: Gender }),
							pronouns: t.string({ required: false }),
							foodPreference: t.string(),
							emergencyContacts: t.string(),
							wantsToReceiveGeneralInformation: t.boolean({
								required: false
							}),
							wantsJoinTeamInformation: t.boolean({ required: false })
						})
					})
				})
			},
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').User]
				};

				userFormSchema.parse(args.data);
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneUserMutationObject(t);
	return {
		deleteOneUser: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').User]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneUserMutationObject(t);
	return {
		updateOneUsersNewsletterPreferences: t.prismaField({
			...field,
			args: {
				email: t.arg.string(),
				wantsToReceiveGeneralInformation: t.arg.boolean({
					required: false
				}),
				wantsJoinTeamInformation: t.arg.boolean({ required: false })
			},
			resolve: async (query, root, args, ctx) => {
				return await db.user.update({
					where: {
						email: args.email
					},
					data: {
						wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation ?? undefined,
						wantsJoinTeamInformation: args.wantsJoinTeamInformation ?? undefined
					}
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneUserMutationObject(t);
	return {
		updateOneUsersGlobalNotes: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				globalNotes: t.arg.string()
			},
			resolve: async (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').User]
				};

				const res = await db.user.update({
					where: args.where,
					data: {
						globalNotes: args.globalNotes
					}
				});

				return res;
			}
		})
	};
});

builder.mutationFields((t) => {
	return {
		upsertSelf: t.field({
			type: builder.simpleObject('UpsertSelfResult', {
				fields: (t) => ({
					userNeedsAdditionalInfo: t.boolean()
				})
			}),
			resolve: async (root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				if (ctx.oidc.tokenSet?.access_token === undefined) {
					throw new GraphQLError('No access token provided');
				}
				const issuerUserData = await fetchUserInfoFromIssuer(
					ctx.oidc.tokenSet?.access_token,
					user.sub
				);

				if (
					!issuerUserData.email ||
					!issuerUserData.family_name ||
					!issuerUserData.given_name ||
					!issuerUserData.preferred_username
				) {
					throw new GraphQLError('OIDC result is missing required fields!');
				}

				const updatedUser = await db.user.upsert({
					where: { id: issuerUserData.sub },
					create: {
						id: issuerUserData.sub,
						email: issuerUserData.email,
						family_name: issuerUserData.family_name,
						given_name: issuerUserData.given_name,
						preferred_username: issuerUserData.preferred_username,
						locale: issuerUserData.locale ?? configPublic.PUBLIC_DEFAULT_LOCALE,
						phone: (issuerUserData as any).phone ?? user.phone
					},
					update: {
						email: issuerUserData.email,
						preferred_username: issuerUserData.preferred_username,
						locale: issuerUserData.locale ?? configPublic.PUBLIC_DEFAULT_LOCALE,
						phone: (issuerUserData as any).phone ?? user.phone
					}
				});

				return { userNeedsAdditionalInfo: !userFormSchema.safeParse(updatedUser).success };
			}
		})
	};
});

builder.mutationFields((t) => {
	return {
		unregisterParticipant: t.prismaField({
			type: 'User',
			args: {
				userId: t.arg.id(),
				conferenceId: t.arg.id()
			},
			resolve: async (query, root, args, ctx) => {
				return db.$transaction(async (tx) => {
					const user = ctx.permissions.getLoggedInUserOrThrow();

					const userToDelete = await tx.user.findUnique({
						where: {
							id: args.userId,
							OR: [
								{ delegationMemberships: { some: { conferenceId: args.conferenceId } } },
								{ singleParticipant: { some: { conferenceId: args.conferenceId } } },
								{ conferenceSupervisor: { some: { conferenceId: args.conferenceId } } }
							]
						},
						include: {
							delegationMemberships: true,
							singleParticipant: true,
							conferenceSupervisor: true,
							conferenceParticipantStatus: true
						}
					});

					if (!userToDelete) {
						throw new GraphQLError('User not found');
					}

					if (
						userToDelete.delegationMemberships
							.map((dm) => dm.conferenceId)
							.includes(args.conferenceId)
					) {
						await tx.delegationMember.delete({
							where: {
								conferenceId_userId: {
									userId: args.userId,
									conferenceId: args.conferenceId
								},
								AND: [ctx.permissions.allowDatabaseAccessTo('delete').DelegationMember]
							}
						});
					}

					if (
						userToDelete.singleParticipant.map((sp) => sp.conferenceId).includes(args.conferenceId)
					) {
						await tx.singleParticipant.delete({
							where: {
								conferenceId_userId: {
									userId: args.userId,
									conferenceId: args.conferenceId
								},
								AND: [ctx.permissions.allowDatabaseAccessTo('delete').SingleParticipant]
							}
						});
					}

					if (
						userToDelete.conferenceSupervisor
							.map((cs) => cs.conferenceId)
							.includes(args.conferenceId)
					) {
						await tx.conferenceSupervisor.delete({
							where: {
								conferenceId_userId: {
									userId: args.userId,
									conferenceId: args.conferenceId
								},
								AND: [ctx.permissions.allowDatabaseAccessTo('delete').ConferenceSupervisor]
							}
						});
					}

					if (
						userToDelete.conferenceParticipantStatus
							.map((cps) => cps.conferenceId)
							.includes(args.conferenceId)
					) {
						await tx.conferenceParticipantStatus.delete({
							where: {
								userId_conferenceId: {
									userId: args.userId,
									conferenceId: args.conferenceId
								},
								AND: [ctx.permissions.allowDatabaseAccessTo('delete').ConferenceParticipantStatus]
							}
						});
					}

					return userToDelete;
				});
			}
		})
	};
});
