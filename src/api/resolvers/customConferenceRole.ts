import { builder } from './builder';
import {
	deleteOneCustomConferenceRoleMutationObject,
	findManyCustomConferenceRoleQueryObject,
	findUniqueCustomConferenceRoleQueryObject,
	CustomConferenceRoleDescriptionFieldObject,
	CustomConferenceRoleFontAwesomeIconFieldObject,
	CustomConferenceRoleIdFieldObject,
	CustomConferenceRoleNameFieldObject,
	updateOneCustomConferenceRoleMutationObject
} from '$db/generated/graphql/CustomConferenceRole';

builder.prismaObject('CustomConferenceRole', {
	fields: (t) => ({
		id: t.field(CustomConferenceRoleIdFieldObject),
		name: t.field(CustomConferenceRoleNameFieldObject),
		description: t.field(CustomConferenceRoleDescriptionFieldObject),
		fontAwesomeIcon: t.field(CustomConferenceRoleFontAwesomeIconFieldObject)
		// 	conference: t.relation('conference'),
		// 	roleApplications: t.relation('roleApplications', {
		// 		query: (_args, ctx) => ({
		// 			where: ctx.permissions.allowDatabaseAccessTo('list').RoleApplication
		// 		})
		// 	})
	})
});

builder.queryFields((t) => {
	const field = findManyCustomConferenceRoleQueryObject(t);
	return {
		findManyCustomConferenceRoles: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').CustomConferenceRole]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueCustomConferenceRoleQueryObject(t);
	return {
		findUniqueCustomConferenceRole: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').CustomConferenceRole]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneCustomConferenceRoleMutationObject(t);
// 	return {
// 		createOneCustomConferenceRole: t.prismaField({
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
	const field = updateOneCustomConferenceRoleMutationObject(t);
	return {
		updateOneCustomConferenceRole: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').CustomConferenceRole]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneCustomConferenceRoleMutationObject(t);
	return {
		deleteOneCustomConferenceRole: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').CustomConferenceRole]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
