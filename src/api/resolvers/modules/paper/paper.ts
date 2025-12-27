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
	PaperTypeFieldObject,
	PaperStatusFieldObject,
	PaperConferenceFieldObject,
	updateOnePaperMutationObject,
	PaperFirstSubmittedAtFieldObject
} from '$db/generated/graphql/Paper';
import { db } from '$db/db';
import { PaperStatus, PaperType, Json } from '$db/generated/graphql/inputs';

builder.prismaObject('Paper', {
	fields: (t) => ({
		id: t.field(PaperIdFieldObject),
		type: t.field(PaperTypeFieldObject),
		status: t.field(PaperStatusFieldObject),
		author: t.relation('author', PaperAuthorFieldObject),
		conference: t.relation('conference', PaperConferenceFieldObject),
		delegation: t.relation('delegation', PaperDelegationFieldObject),
		agendaItem: t.relation('agendaItem', PaperAgendaItemFieldObject),
		versions: t.relation('versions'),
		firstSubmittedAt: t.field(PaperFirstSubmittedAtFieldObject),
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
			args: {
				data: t.arg({
					type: t.builder.inputType('CreateOnePaperArgs', {
						fields: (t) => ({
							conferenceId: t.string({ required: true }),
							authorId: t.string({ required: true }),
							delegationId: t.string({ required: true }),
							agendaItemId: t.string({ required: false }),
							type: t.field({ type: PaperType, required: true }),
							content: t.field({ type: Json, required: true }),
							status: t.field({ type: PaperStatus, required: false })
						})
					})
				})
			},
			resolve: async (query, root, args, ctx, info) => {
				ctx.permissions.getLoggedInUserOrThrow();

				const paperDataArgs = {
					...args.data,
					status: args.data.status ?? undefined,
					firstSubmittedAt: args.data.status === 'SUBMITTED' ? new Date() : undefined,
					content: undefined
				};

				return await db.$transaction(async (tx) => {
					const paper = await tx.paper.create({
						data: paperDataArgs
					});

					await tx.paperVersion.create({
						data: {
							content: args.data.content,
							paperId: paper.id,
							status: args.data.status ?? undefined,
							version: 1
						}
					});

					return paper;
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOnePaperMutationObject(t);
	return {
		updateOnePaper: t.prismaField({
			...field,
			args: {
				where: t.arg({
					type: t.builder.inputType('UpdateOnePaperWhereArgs', {
						fields: (t) => ({
							paperId: t.string({ required: true })
						})
					})
				}),
				data: t.arg({
					type: t.builder.inputType('UpdateOnePaperArgs', {
						fields: (t) => ({
							content: t.field({ type: Json, required: true }),
							status: t.field({ type: PaperStatus, required: false })
						})
					})
				})
			},
			resolve: async (query, root, args, ctx, info) => {
				ctx.permissions.getLoggedInUserOrThrow();

				const paperDBEntry = await db.paper.findUniqueOrThrow({
					where: {
						id: args.where.paperId
					},
					include: {
						versions: true
					}
				});

				const isFirstSubmission =
					paperDBEntry.firstSubmittedAt === null && args.data.status !== 'DRAFT';

				return await db.$transaction(async (tx) => {
					const paper = await tx.paper.update({
						where: {
							id: args.where.paperId
						},
						data: {
							firstSubmittedAt: isFirstSubmission ? new Date() : undefined,
							updatedAt: new Date(),
							status: args.data.status ?? undefined
						}
					});

					await tx.paperVersion.create({
						data: {
							content: args.data.content,
							paperId: paper.id,
							status: args.data.status ?? undefined,
							version: paperDBEntry.versions.length + 1
						}
					});

					return paper;
				});
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
