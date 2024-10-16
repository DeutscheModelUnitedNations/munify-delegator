import { builder } from './builder';
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
	UserWantsJoinTeamInformationFieldObject
} from '$db/generated/graphql/User';
import { fetchUserInfoFromIssuer } from '$api/services/OIDC';
import { db } from '$db/db';
import { configPublic } from '$config/public';
import { userDataCompleteCheck } from '$api/services/userDataComplete';

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
		wantsToReceiveGeneralInformation: t.field(UserWantsToReceiveGeneralInformationFieldObject),
		wantsJoinTeamInformation: t.field(UserWantsJoinTeamInformationFieldObject),
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

// builder.mutationFields((t) => {
// 	const field = createOneUserMutationObject(t);
// 	return {
// 		createOneUser: t.prismaField({
// 			...field,
// 			args: { ...field.args, token: t.arg.string({ required: true }) },
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
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').User]
				};
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

const UpsertSelfResult = builder
	.objectRef<{
		userNeedsAdditionalInfo: boolean;
	}>('UpsertSelfResult')
	.implement({
		fields: (t) => ({
			userNeedsAdditionalInfo: t.exposeBoolean('userNeedsAdditionalInfo')
		})
	});

builder.mutationFields((t) => {
	return {
		upsertSelf: t.field({
			type: UpsertSelfResult,
			resolve: async (root, args, ctx) => {
				const user = ctx.permissions.mustBeLoggedIn();
				if (ctx.oidc.tokenSet?.access_token === undefined) {
					throw new Error('No access token provided');
				}
				const issuerUserData = await fetchUserInfoFromIssuer(ctx.oidc.tokenSet?.access_token);

				if (
					!issuerUserData.email ||
					!issuerUserData.family_name ||
					!issuerUserData.given_name ||
					!issuerUserData.preferred_username
				) {
					throw new Error('OIDC result is missing required fields!');
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
						family_name: issuerUserData.family_name,
						given_name: issuerUserData.given_name,
						preferred_username: issuerUserData.preferred_username,
						locale: issuerUserData.locale ?? configPublic.PUBLIC_DEFAULT_LOCALE,
						phone: issuerUserData.phone ?? user.phone
					}
				});

				return { userNeedsAdditionalInfo: userDataCompleteCheck(updatedUser, 'de').length > 0 };
			}
		})
	};
});
