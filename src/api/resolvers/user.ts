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

builder.prismaObject('User', {
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
