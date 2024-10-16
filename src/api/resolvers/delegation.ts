import { builder } from './builder';
import {
	deleteOneDelegationMutationObject,
	findManyDelegationQueryObject,
	findUniqueDelegationQueryObject,
	DelegationAppliedFieldObject,
	DelegationExperienceFieldObject,
	DelegationIdFieldObject,
	DelegationMotivationFieldObject,
	DelegationSchoolFieldObject,
	updateOneDelegationMutationObject,
	DelegationEntryCodeFieldObject
} from '$db/generated/graphql/Delegation';

builder.prismaObject('Delegation', {
	fields: (t) => ({
		id: t.field(DelegationIdFieldObject),
		applied: t.field(DelegationAppliedFieldObject),
		school: t.field(DelegationSchoolFieldObject),
		motivation: t.field(DelegationMotivationFieldObject),
		experience: t.field(DelegationExperienceFieldObject),
		entryCode: t.field(DelegationEntryCodeFieldObject),
		conference: t.relation('conference'),
		members: t.relation('members', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		}),
		supervisors: t.relation('supervisors', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceSupervisor
			})
		}),
		appliedForRoles: t.relation('appliedForRoles', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').RoleApplication
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyDelegationQueryObject(t);
	return {
		findManyDelegations: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Delegation]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueDelegationQueryObject(t);
	return {
		findUniqueDelegation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Delegation]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneDelegationMutationObject(t);
// 	return {
// 		createOneDelegation: t.prismaField({
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
	const field = updateOneDelegationMutationObject(t);
	return {
		updateOneDelegation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Delegation]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneDelegationMutationObject(t);
	return {
		deleteOneDelegation: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Delegation]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
