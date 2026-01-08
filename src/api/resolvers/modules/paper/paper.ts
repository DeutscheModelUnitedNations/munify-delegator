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
import { GraphQLError } from 'graphql';
import { m } from '$lib/paraglide/messages';

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
					const conference = await tx.conference.findUniqueOrThrow({
						where: {
							id: args.data.conferenceId
						}
					});

					if (!conference.isOpenPaperSubmission) {
						throw new GraphQLError(m.paperSubmissionClosed());
					}

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

				return await db.$transaction(async (tx) => {
					const paperDBEntry = await tx.paper.findUniqueOrThrow({
						where: {
							id: args.where.paperId
						},
						include: {
							versions: true,
							conference: true
						}
					});

					if (!paperDBEntry.conference.isOpenPaperSubmission) {
						throw new GraphQLError(m.paperSubmissionClosed());
					}

					const isFirstSubmission =
						paperDBEntry.firstSubmittedAt === null && args.data.status !== 'DRAFT';

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

// Define types for grouped papers query
const AgendaItemPaperGroupRef = builder.objectRef<{
	agendaItem: any;
	papers: any[];
}>('AgendaItemPaperGroup');

const CommitteePaperGroupRef = builder.objectRef<{
	committee: any;
	agendaItems: Array<{ agendaItem: any; papers: any[] }>;
}>('CommitteePaperGroup');

AgendaItemPaperGroupRef.implement({
	fields: (t) => ({
		agendaItem: t.field({
			type: 'CommitteeAgendaItem',
			nullable: true,
			resolve: (parent) => parent.agendaItem
		}),
		papers: t.field({
			type: ['Paper'],
			resolve: (parent) => parent.papers
		})
	})
});

CommitteePaperGroupRef.implement({
	fields: (t) => ({
		committee: t.field({
			type: 'Committee',
			resolve: (parent) => parent.committee
		}),
		agendaItems: t.field({
			type: [AgendaItemPaperGroupRef],
			resolve: (parent) => parent.agendaItems
		})
	})
});

builder.queryFields((t) => ({
	findPapersGroupedByCommittee: t.field({
		type: [CommitteePaperGroupRef],
		args: {
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Verify user is a team member with appropriate role
			const teamMember = await db.teamMember.findFirst({
				where: {
					conferenceId: args.conferenceId,
					userId: user.sub,
					role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
				}
			});

			if (!teamMember) {
				throw new GraphQLError('Access denied - requires team member status');
			}

			// Fetch all papers with related data (exclude drafts)
			const papers = await db.paper.findMany({
				where: { conferenceId: args.conferenceId, status: { not: 'DRAFT' } },
				include: {
					agendaItem: {
						include: {
							committee: true
						}
					},
					delegation: {
						include: {
							assignedNation: true,
							assignedNonStateActor: true
						}
					},
					versions: {
						orderBy: { version: 'desc' },
						take: 1
					}
				}
			});

			// Group by committee and agenda item
			const grouped = new Map();

			for (const paper of papers) {
				if (!paper.agendaItem) continue;

				const committeeId = paper.agendaItem.committee.id;
				const agendaItemId = paper.agendaItem.id;

				if (!grouped.has(committeeId)) {
					grouped.set(committeeId, {
						committee: paper.agendaItem.committee,
						agendaItems: new Map()
					});
				}

				const committeeGroup = grouped.get(committeeId);
				if (!committeeGroup.agendaItems.has(agendaItemId)) {
					committeeGroup.agendaItems.set(agendaItemId, {
						agendaItem: paper.agendaItem,
						papers: []
					});
				}

				committeeGroup.agendaItems.get(agendaItemId).papers.push(paper);
			}

			// Convert to array format
			return Array.from(grouped.values()).map((committee) => ({
				committee: committee.committee,
				agendaItems: Array.from(committee.agendaItems.values())
			}));
		}
	})
}));
