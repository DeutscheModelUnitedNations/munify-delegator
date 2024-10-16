import { builder } from './builder';
import {
	deleteOneRoleApplicationMutationObject,
	findManyRoleApplicationQueryObject,
	findUniqueRoleApplicationQueryObject,
	RoleApplicationIdFieldObject,
	RoleApplicationRankFieldObject,
	updateOneRoleApplicationMutationObject
} from '$db/generated/graphql/RoleApplication';

builder.prismaObject('RoleApplication', {
	fields: (t) => ({
		id: t.field(RoleApplicationIdFieldObject),
		rank: t.field(RoleApplicationRankFieldObject),
		delegation: t.relation('delegation'),
		nation: t.relation('nation'),
		nonStateActor: t.relation('nonStateActor')
	})
});

builder.queryFields((t) => {
	const field = findManyRoleApplicationQueryObject(t);
	return {
		findManyRoleApplications: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').RoleApplication]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueRoleApplicationQueryObject(t);
	return {
		findUniqueRoleApplication: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').RoleApplication]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneRoleApplicationMutationObject(t);
// 	return {
// 		createOneRoleApplication: t.prismaField({
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
	const field = updateOneRoleApplicationMutationObject(t);
	return {
		updateOneRoleApplication: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').RoleApplication]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneRoleApplicationMutationObject(t);
	return {
		deleteOneRoleApplication: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').RoleApplication]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
