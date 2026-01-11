import { builder } from '../builder';
import {
	CommitteeAgendaItemCommitteeFieldObject,
	CommitteeAgendaItemIdFieldObject,
	CommitteeAgendaItemReviewHelpStatusFieldObject,
	CommitteeAgendaItemTeaserTextFieldObject,
	CommitteeAgendaItemTitleFieldObject,
	createOneCommitteeAgendaItemMutationObject,
	deleteOneCommitteeAgendaItemMutationObject,
	findManyCommitteeAgendaItemQueryObject,
	findUniqueCommitteeAgendaItemQueryObject,
	updateOneCommitteeAgendaItemMutationObject
} from '$db/generated/graphql/CommitteeAgendaItem';
import { ReviewHelpStatus } from '$db/generated/graphql/inputs';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';

export const GQLCommitteeAgendaItem = builder.prismaObject('CommitteeAgendaItem', {
	fields: (t) => ({
		id: t.field(CommitteeAgendaItemIdFieldObject),
		title: t.field(CommitteeAgendaItemTitleFieldObject),
		teaserText: t.field(CommitteeAgendaItemTeaserTextFieldObject),
		reviewHelpStatus: t.field(CommitteeAgendaItemReviewHelpStatusFieldObject),
		committee: t.relation('committee', CommitteeAgendaItemCommitteeFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManyCommitteeAgendaItemQueryObject(t);
	return {
		findManyAgendaItems: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').CommitteeAgendaItem]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueCommitteeAgendaItemQueryObject(t);
	return {
		findUniqueAgendaItem: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').CommitteeAgendaItem]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneCommitteeAgendaItemMutationObject(t);
	return {
		createOneAgendaItem: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();
				if (!ctx.oidc.user?.hasRole('admin') && !ctx.oidc.user?.hasRole('service_user')) {
					throw new Error('Only admins can create agenda items');
				}

				args.data = {
					...args.data
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneCommitteeAgendaItemMutationObject(t);
	return {
		updateOneAgendaItem: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').CommitteeAgendaItem]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneCommitteeAgendaItemMutationObject(t);
	return {
		deleteOneAgendaItem: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').CommitteeAgendaItem]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// Mutation to set review help status - accessible by reviewers
builder.mutationFields((t) => ({
	setAgendaItemReviewHelpStatus: t.prismaField({
		type: 'CommitteeAgendaItem',
		args: {
			agendaItemId: t.arg.string({ required: true }),
			status: t.arg({ type: ReviewHelpStatus, required: true })
		},
		resolve: async (query, _, { agendaItemId, status }, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Get the agenda item to find its conference
			const agendaItem = await db.committeeAgendaItem.findUnique({
				where: { id: agendaItemId },
				include: {
					committee: {
						include: {
							conference: true
						}
					}
				}
			});

			if (!agendaItem) {
				throw new GraphQLError('Agenda item not found');
			}

			// Check if user is a reviewer for this conference
			const teamMember = await db.teamMember.findFirst({
				where: {
					conferenceId: agendaItem.committee.conferenceId,
					userId: user.sub,
					role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
				}
			});

			if (!teamMember) {
				throw new GraphQLError('Access denied - requires reviewer status');
			}

			// Update the review help status
			return db.committeeAgendaItem.update({
				...query,
				where: { id: agendaItemId },
				data: { reviewHelpStatus: status }
			});
		}
	})
}));
