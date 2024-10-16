import { builder } from './builder';
import {
	deleteOneNationMutationObject,
	findManyNationQueryObject,
	findUniqueNationQueryObject,
	NationAlpha2CodeFieldObject,
	NationAlpha3CodeFieldObject,
	updateOneNationMutationObject
} from '$db/generated/graphql/Nation';

builder.prismaObject('Nation', {
	fields: (t) => ({
		alpha3Code: t.field(NationAlpha3CodeFieldObject),
		alpha2Code: t.field(NationAlpha2CodeFieldObject),
		roleApplications: t.relation('roleApplications', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').RoleApplication
			})
		}),
		committees: t.relation('committees', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Committee
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyNationQueryObject(t);
	return {
		findManyNations: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Nation]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueNationQueryObject(t);
	return {
		findUniqueNation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Nation]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneNationMutationObject(t);
// 	return {
// 		createOneNation: t.prismaField({
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
	const field = updateOneNationMutationObject(t);
	return {
		updateOneNation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Nation]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneNationMutationObject(t);
	return {
		deleteOneNation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Nation]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
