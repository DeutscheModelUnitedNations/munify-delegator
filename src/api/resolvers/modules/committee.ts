import { builder } from '../builder';
import {
	CommitteeAbbreviationFieldObject,
	CommitteeConferenceFieldObject,
	CommitteeDelegationMembersFieldObject,
	CommitteeIdFieldObject,
	CommitteeNameFieldObject,
	CommitteeNumOfSeatsPerDelegationFieldObject,
	CommitteeResolutionHeadlineFieldObject,
	deleteOneCommitteeMutationObject,
	findManyCommitteeQueryObject,
	findUniqueCommitteeQueryObject,
	updateOneCommitteeMutationObject
} from '$db/generated/graphql/Committee';
import { db } from '$db/db';

export const GQLCommittee = builder.prismaObject('Committee', {
	fields: (t) => ({
		id: t.field(CommitteeIdFieldObject),
		name: t.field(CommitteeNameFieldObject),
		abbreviation: t.field(CommitteeAbbreviationFieldObject),
		numOfSeatsPerDelegation: t.field(CommitteeNumOfSeatsPerDelegationFieldObject),
		resolutionHeadline: t.field(CommitteeResolutionHeadlineFieldObject),
		conference: t.relation('conference', CommitteeConferenceFieldObject),
		nations: t.relation('nations', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Nation
			})
		}),
		delegationMembers: t.relation('delegationMembers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		}),
		agendaItems: t.relation('CommitteeAgendaItem', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CommitteeAgendaItem
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
			args: {
				where: field.args.where,
				data: t.arg({
					type: t.builder.inputType('CommitteeUpdateDataInput', {
						fields: (t) => ({
							name: t.string({ required: false }),
							abbreviation: t.string({ required: false }),
							resolutionHeadline: t.string({ required: false })
						})
					})
				})
			},
			resolve: async (query, root, args, ctx) => {
				return await db.committee.update({
					where: {
						...args.where,
						AND: [ctx.permissions.allowDatabaseAccessTo('update').Committee]
					},
					data: {
						name: args.data.name ?? undefined,
						abbreviation: args.data.abbreviation ?? undefined,
						resolutionHeadline: args.data.resolutionHeadline
					},
					...query
				});
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
