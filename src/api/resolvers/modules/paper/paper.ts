import { builder } from '../../builder';
import {
	createOnePaperMutationObject,
	deleteOnePaperMutationObject,
	findManyPaperQueryObject,
	findUniquePaperQueryObject,
	PaperAgendaItemFieldObject,
	PaperAuthorFieldObject,
	PaperCreatedAtFieldObject,
	PaperDelegationFieldObject,
	PaperIdFieldObject,
	PaperUpdatedAtFieldObject,
	PaperVersionsFieldObject,
	PaperTypeFieldObject,
	PaperStatusFieldObject,
	PaperConferenceFieldObject,
	updateOnePaperMutationObject
} from '$db/generated/graphql/Paper';
import { db } from '$db/db';

builder.prismaObject('Paper', {
	fields: (t) => ({
		id: t.field(PaperIdFieldObject),
		type: t.field(PaperTypeFieldObject),
		status: t.field(PaperStatusFieldObject),
		author: t.relation('author', PaperAuthorFieldObject),
		conference: t.relation('conference', PaperConferenceFieldObject),
		delegation: t.relation('delegation', PaperDelegationFieldObject),
		agendaItem: t.relation('agendaItem', PaperAgendaItemFieldObject),
		versions: t.relation('versions', PaperVersionsFieldObject),
		createdAt: t.field(PaperCreatedAtFieldObject),
		updatedAt: t.field(PaperUpdatedAtFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findUniquePaperQueryObject(t);
	return {
		findUniquePaper: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const paper = await db.paper.findUniqueOrThrow({
					where: { ...args.where, AND: [ctx.permissions.allowDatabaseAccessTo('read').Paper] }
				});
				return field.resolve(query, root, { where: { id: paper.id } }, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findManyPaperQueryObject(t);
	return {
		findManyPapers: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Paper]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOnePaperMutationObject(t);
	return {
		createOnePaper: t.prismaField({
			...field,

			resolve: async (query, root, args, ctx, info) => {
				ctx.permissions.getLoggedInUserOrThrow();
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOnePaperMutationObject(t);
	return {
		updateOnePaper: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const paper = await db.paper.findUniqueOrThrow({
					where: { ...args.where, AND: [ctx.permissions.allowDatabaseAccessTo('update').Paper] }
				});
				return field.resolve(query, root, { ...args, where: { id: paper.id } }, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOnePaperMutationObject(t);
	return {
		deleteOnePaper: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const paper = await db.paper.findUniqueOrThrow({
					where: { ...args.where, AND: [ctx.permissions.allowDatabaseAccessTo('delete').Paper] }
				});
				return field.resolve(query, root, { where: { id: paper.id } }, ctx, info);
			}
		})
	};
});
