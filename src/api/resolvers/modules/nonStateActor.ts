import { builder } from '../builder';
import {
	deleteOneNonStateActorMutationObject,
	findManyNonStateActorQueryObject,
	findUniqueNonStateActorQueryObject,
	NonStateActorAbbreviationFieldObject,
	NonStateActorConferenceFieldObject,
	NonStateActorDescriptionFieldObject,
	NonStateActorFontAwesomeIconFieldObject,
	NonStateActorIdFieldObject,
	NonStateActorNameFieldObject,
	NonStateActorSeatAmountFieldObject
} from '$db/generated/graphql/NonStateActor';

builder.prismaObject('NonStateActor', {
	fields: (t) => ({
		id: t.field(NonStateActorIdFieldObject),
		name: t.field(NonStateActorNameFieldObject),
		description: t.field(NonStateActorDescriptionFieldObject),
		fontAwesomeIcon: t.field(NonStateActorFontAwesomeIconFieldObject),
		abbreviation: t.field(NonStateActorAbbreviationFieldObject),
		seatAmount: t.field(NonStateActorSeatAmountFieldObject),
		conference: t.relation('conference', NonStateActorConferenceFieldObject),
		roleApplications: t.relation('roleApplications', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').RoleApplication
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyNonStateActorQueryObject(t);
	return {
		findManyNonStateActors: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').NonStateActor]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueNonStateActorQueryObject(t);
	return {
		findUniqueNonStateActor: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').NonStateActor]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneNonStateActorMutationObject(t);
// 	return {
// 		createOneNonStateActor: t.prismaField({
// 			...field,

// 			resolve: async (query, root, args, ctx, info) => {
// 				//TODO check permissions

// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

// builder.mutationFields((t) => {
// 	const field = updateOneNonStateActorMutationObject(t);
// 	return {
// 		updateOneNonStateActor: t.prismaField({
// 			...field,
// 			args: { where: field.args.where },
// 			resolve: (query, root, args, ctx, info) => {
// 				args.where = {
// 					...args.where,
// 					AND: [ctx.permissions.allowDatabaseAccessTo('update').NonStateActor]
// 				};
// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

builder.mutationFields((t) => {
	const field = deleteOneNonStateActorMutationObject(t);
	return {
		deleteOneNonStateActor: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').NonStateActor]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
