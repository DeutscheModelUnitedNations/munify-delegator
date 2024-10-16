import { builder } from './builder';
import {
	deleteOneDelegationMemberMutationObject,
	findManyDelegationMemberQueryObject,
	findUniqueDelegationMemberQueryObject,
	DelegationMemberIdFieldObject,
	updateOneDelegationMemberMutationObject,
	DelegationMemberIsHeadDelegateFieldObject
} from '$db/generated/graphql/DelegationMember';

builder.prismaObject('DelegationMember', {
	fields: (t) => ({
		id: t.field(DelegationMemberIdFieldObject),
		isHeadDelegate: t.field(DelegationMemberIsHeadDelegateFieldObject),
		conference: t.relation('conference'),
		delegation: t.relation('delegation'),
		user: t.relation('user')
	})
});

builder.queryFields((t) => {
	const field = findManyDelegationMemberQueryObject(t);
	return {
		findManyDelegationMembers: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').DelegationMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueDelegationMemberQueryObject(t);
	return {
		findUniqueDelegationMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').DelegationMember]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneDelegationMemberMutationObject(t);
// 	return {
// 		createOneDelegationMember: t.prismaField({
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
	const field = updateOneDelegationMemberMutationObject(t);
	return {
		updateOneDelegationMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').DelegationMember]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneDelegationMemberMutationObject(t);
	return {
		deleteOneDelegationMember: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').DelegationMember]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
