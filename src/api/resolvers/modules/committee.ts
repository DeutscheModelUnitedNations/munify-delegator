import { builder } from '../builder';
import {
	CommitteeAbbreviationFieldObject,
	CommitteeIdFieldObject,
	CommitteeNameFieldObject,
	CommitteeNumOfSeatsPerDelegationFieldObject,
	deleteOneCommitteeMutationObject,
	findManyCommitteeQueryObject,
	findUniqueCommitteeQueryObject,
	updateOneCommitteeMutationObject
} from '$db/generated/graphql/Committee';

builder.prismaObject('Committee', {
	fields: (t) => ({
		id: t.field(CommitteeIdFieldObject),
		name: t.field(CommitteeNameFieldObject),
		abbreviation: t.field(CommitteeAbbreviationFieldObject),
		numOfSeatsPerDelegation: t.field(CommitteeNumOfSeatsPerDelegationFieldObject),
		conference: t.relation('conference'),
		nations: t.relation('nations', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Nation
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyCommitteeQueryObject(t);
	return {
		findManyCommittees: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Committee]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueCommitteeQueryObject(t);
	return {
		findUniqueCommittee: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Committee]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneCommitteeMutationObject(t);
// 	return {
// 		createOneCommittee: t.prismaField({
// 			...field,

// 			resolve: async (query, root, args, ctx, info) => {
// 				//TODO check permissions

// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

builder.mutationFields((t) => {
	const field = updateOneCommitteeMutationObject(t);
	return {
		updateOneCommittee: t.prismaField({
			...field,
			args: { where: field.args.where },
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Committee]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneCommitteeMutationObject(t);
	return {
		deleteOneCommittee: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Committee]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
