import { builder } from './builder';
import {
	deleteOneTeamMemberMutationObject,
	findManyTeamMemberQueryObject,
	findUniqueTeamMemberQueryObject,
	TeamMemberIdFieldObject,
	TeamMemberRoleFieldObject,
	updateOneTeamMemberMutationObject
} from '$db/generated/graphql/TeamMember';

builder.prismaObject('TeamMember', {
	fields: (t) => ({
		id: t.field(TeamMemberIdFieldObject),
		role: t.field(TeamMemberRoleFieldObject),
		conference: t.relation('conference'),
		user: t.relation('user')
	})
});

builder.queryFields((t) => {
	const field = findManyTeamMemberQueryObject(t);
	return {
		findManyTeamMembers: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').TeamMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueTeamMemberQueryObject(t);
	return {
		findUniqueTeamMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').TeamMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneTeamMemberMutationObject(t);
// 	return {
// 		createOneTeamMember: t.prismaField({
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
	const field = updateOneTeamMemberMutationObject(t);
	return {
		updateOneTeamMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').TeamMember]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneTeamMemberMutationObject(t);
	return {
		deleteOneTeamMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').TeamMember]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
