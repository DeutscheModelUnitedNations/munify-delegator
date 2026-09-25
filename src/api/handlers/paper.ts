import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import { type TeamRole, systemAdmin, userId } from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';
import { fetchUserParticipations } from '$api/services/participation';
import { CommitteeRef } from './committee';
import { CommitteeAgendaItemRef } from './committeeAgendaItem';
import type { InferSelectModel } from 'drizzle-orm';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';
import codenmz from '$lib/helpers/codenamize';

/** Roles that may see and manage papers in their conference. */
const PAPER_ROLES = [
	'REVIEWER',
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

const paperTeam = (id: string) => ({
	teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } }
});

// Ported from abilities/entities/paper/paper.ts
abilityBuilder.paper.allow(['read', 'update', 'delete']).when(systemAdmin);

// Authors see and edit their own papers.
abilityBuilder.paper.allow(['read', 'update']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { author: { id } } } : undefined;
});

// Reviewers and conference management see and manage the conference's papers.
abilityBuilder.paper.allow(['read', 'update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { conference: paperTeam(id) } } : undefined;
});

// Supervisors see the submitted papers of the delegations they supervise.
abilityBuilder.paper.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					delegation: { members: { supervisors: { user: { id } } } },
					status: { ne: 'DRAFT' }
				}
			}
		: undefined;
});

// Participants of a conference may see its submitted papers.
//
// NOTE: the CASL rule this replaces granted `list` only, not `read`, so a participant could
// list these papers but not fetch one by id. Rumble has no separate list action (neither does
// chase), so this maps to `read` and is the one place in the port where access widens.
abilityBuilder.paper.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					conference: {
						OR: [
							{ delegations: { members: { userId: id } } },
							{ singleParticipants: { userId: id } },
							{ conferenceSupervisors: { userId: id } }
						]
					},
					status: { ne: 'DRAFT' }
				}
			}
		: undefined;
});

export const PaperRef = object({ table: 'paper' });
query({ table: 'paper' });

const paperTypeEnum = enum_({ tsName: 'paperType' });
const paperStatusEnum = enum_({ tsName: 'paperStatus' });

schemaBuilder.mutationFields((t) => ({
	createPaper: t.drizzleField({
		type: PaperRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			authorId: t.arg.id({ required: true }),
			delegationId: t.arg.id({ required: true }),
			agendaItemId: t.arg.id(),
			type: t.arg({ type: paperTypeEnum, required: true }),
			content: t.arg({ type: 'JSON', required: true }),
			status: t.arg({ type: paperStatusEnum })
		},
		resolve: async (query, _root, args, ctx) => {
			if (!userId(ctx)) {
				throw new GraphQLError('Must be logged in');
			}

			const created = await db.transaction(async (tx) => {
				const conference = await tx.query.conference
					.findFirst({ where: { id: args.conferenceId } })
					.then(assertFindFirstExists);

				if (!conference.isOpenPaperSubmission) {
					throw new GraphQLError(m.paperSubmissionClosed());
				}

				const paper = await tx
					.insert(schema.paper)
					.values({
						conferenceId: args.conferenceId,
						authorId: args.authorId,
						delegationId: args.delegationId,
						agendaItemId: args.agendaItemId ?? undefined,
						type: args.type,
						status: args.status ?? undefined,
						// Stamped only when the paper goes straight out as a submission.
						firstSubmittedAt: args.status === 'SUBMITTED' ? new Date() : undefined
					})
					.returning()
					.then(assertFirstEntryExists);

				// The content lives on versions, never on the paper row itself.
				await tx.insert(schema.paperVersion).values({
					paperId: paper.id,
					content: args.content,
					status: args.status ?? undefined,
					version: 1
				});

				return paper;
			});

			return db.query.paper
				.findFirst(
					query(
						ctx.abilities.paper.filter('read').merge({ where: { id: created.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Each update appends a new version rather than editing the previous one. */
	updatePaper: t.drizzleField({
		type: PaperRef,
		args: {
			paperId: t.arg.id({ required: true }),
			content: t.arg({ type: 'JSON', required: true }),
			status: t.arg({ type: paperStatusEnum })
		},
		resolve: async (query, _root, args, ctx) => {
			if (!userId(ctx)) {
				throw new GraphQLError('Must be logged in');
			}

			await db.transaction(async (tx) => {
				const paper = await tx.query.paper
					.findFirst({
						...ctx.abilities.paper.filter('update').merge({ where: { id: args.paperId } }).query
							.single,
						with: { versions: { with: { reviews: true } }, conference: true }
					})
					.then(assertFindFirstExists);

				if (!paper.conference?.isOpenPaperSubmission) {
					throw new GraphQLError(m.paperSubmissionClosed());
				}

				const isFirstSubmission = paper.firstSubmittedAt === null && args.status !== 'DRAFT';
				const hasAnyReviews = paper.versions.some((version) => version.reviews.length > 0);

				// A resubmission of an already-reviewed paper counts as REVISED, not SUBMITTED - and a
				// client asking for REVISED directly is normalised to SUBMITTED first so the rule below
				// is the only thing that can produce REVISED.
				let status: typeof args.status = args.status === 'REVISED' ? 'SUBMITTED' : args.status;
				if (status === 'SUBMITTED' && hasAnyReviews) {
					status = 'REVISED';
				}

				await tx
					.update(schema.paper)
					.set({
						status: status ?? undefined,
						firstSubmittedAt: isFirstSubmission ? new Date() : undefined,
						updatedAt: new Date()
					})
					.where(eq(schema.paper.id, args.paperId));

				await tx.insert(schema.paperVersion).values({
					paperId: args.paperId,
					content: args.content,
					status: status ?? undefined,
					version: paper.versions.length + 1
				});
			});

			return db.query.paper
				.findFirst(
					query(
						ctx.abilities.paper.filter('read').merge({ where: { id: args.paperId } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deletePaper: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.paper)
				.where(ctx.abilities.paper.filter('delete').merge({ where: { id: args.id } }).sql.where)
				.returning({ id: schema.paper.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Paper not found, or not yours to delete');
			}
			return true;
		}
	})
}));

/** Team roles that may see the whole conference's papers. */
export async function assertPaperReviewer(conferenceId: string, callerId: string | undefined) {
	if (!callerId) {
		throw new GraphQLError('Must be logged in');
	}
	const teamMember = await db.query.teamMember.findFirst({
		where: { conferenceId, userId: callerId, role: { in: [...PAPER_ROLES] } }
	});
	if (!teamMember) {
		throw new GraphQLError('Access denied - requires team member status');
	}
}

schemaBuilder.queryFields((t) => ({
	/**
	 * Introduction papers are the ones with no agenda item - a non-state actor writes one per
	 * conference rather than one per topic.
	 */
	findIntroductionPapers: t.drizzleField({
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertPaperReviewer(args.conferenceId, userId(ctx));

			return db.query.paper.findMany(
				query(
					ctx.abilities.paper.filter('read').merge({
						where: {
							conferenceId: args.conferenceId,
							status: { ne: 'DRAFT' },
							agendaItemId: { isNull: true }
						}
					}).query.many
				)
			);
		}
	}),

	/** Papers of the delegations the caller supervises. */
	findSupervisedPapers: t.drizzleField({
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}

			const supervised = await db.query.delegationMember.findMany({
				where: { conferenceId: args.conferenceId, supervisors: { userId: callerId } },
				columns: { delegationId: true }
			});

			const delegationIds = [...new Set(supervised.map((member) => member.delegationId))];
			if (delegationIds.length === 0) return [];

			return db.query.paper.findMany(
				query(
					ctx.abilities.paper.filter('read').merge({
						where: {
							conferenceId: args.conferenceId,
							delegationId: { in: delegationIds },
							status: { ne: 'DRAFT' }
						}
					}).query.many
				)
			);
		}
	})
}));

/** Any participant of the conference - delegate, single participant or supervisor. */
async function assertConferenceParticipant(conferenceId: string, callerId: string | undefined) {
	if (!callerId) {
		throw new GraphQLError('Must be logged in');
	}
	const participation = await fetchUserParticipations({ conferenceId, userId: callerId });
	if (
		!participation.foundDelegationMember &&
		!participation.foundSingleParticipant &&
		!participation.foundSupervisor
	) {
		throw new GraphQLError('Access denied - requires conference participant status');
	}
}

schemaBuilder.queryFields((t) => ({
	/** Introduction papers as any participant may see them, not just reviewers. */
	findGlobalIntroductionPapers: t.drizzleField({
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertConferenceParticipant(args.conferenceId, userId(ctx));

			return db.query.paper.findMany(
				query(
					ctx.abilities.paper.filter('read').merge({
						where: {
							conferenceId: args.conferenceId,
							status: { ne: 'DRAFT' },
							agendaItemId: { isNull: true }
						}
					}).query.many
				)
			);
		}
	}),

	/**
	 * A single paper for the public paper view.
	 *
	 * Authors and reviewers may read it in any state; everybody else must be a participant of the
	 * conference and may not see drafts. The checks are ordered exactly as before, so an author
	 * reading their own draft still succeeds.
	 */
	findPublicPaperContent: t.drizzleField({
		type: PaperRef,
		args: { paperId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}

			const paper = await db.query.paper
				.findFirst({ where: { id: args.paperId } })
				.then(assertFindFirstExists);

			const isAuthor = paper.authorId === callerId;
			const teamMember = await db.query.teamMember.findFirst({
				where: {
					conferenceId: paper.conferenceId,
					userId: callerId,
					role: { in: [...PAPER_ROLES] }
				}
			});

			if (!isAuthor && !teamMember) {
				await assertConferenceParticipant(paper.conferenceId, callerId);
				if (paper.status === 'DRAFT') {
					throw new GraphQLError('Access denied - cannot view draft papers');
				}
			}

			return db.query.paper
				.findFirst(query({ where: { id: args.paperId } }))
				.then(assertFindFirstExists);
		}
	})
}));

type CommitteeRow = InferSelectModel<typeof schema.committee>;
type AgendaItemRow = InferSelectModel<typeof schema.committeeAgendaItem>;
type PaperRow = InferSelectModel<typeof schema.paper>;

type AgendaItemGroup = { agendaItem: AgendaItemRow; papers: PaperRow[] };
type CommitteeGroup = { committee: CommitteeRow; agendaItems: AgendaItemGroup[] };

const AgendaItemPaperGroup = schemaBuilder
	.objectRef<AgendaItemGroup>('AgendaItemPaperGroup')
	.implement({
		fields: (t) => ({
			agendaItem: t.field({
				type: CommitteeAgendaItemRef,
				nullable: true,
				resolve: (parent) => parent.agendaItem
			}),
			papers: t.field({ type: [PaperRef], resolve: (parent) => parent.papers })
		})
	});

const CommitteePaperGroup = schemaBuilder
	.objectRef<CommitteeGroup>('CommitteePaperGroup')
	.implement({
		fields: (t) => ({
			committee: t.field({ type: CommitteeRef, resolve: (parent) => parent.committee }),
			agendaItems: t.field({
				type: [AgendaItemPaperGroup],
				resolve: (parent) => parent.agendaItems
			})
		})
	});

/**
 * Groups a conference's submitted papers by committee, then by agenda item.
 *
 * Papers without an agenda item are skipped - those are introduction papers, which have their
 * own query. Grouping happens in memory rather than in SQL because the result is a nested shape
 * rather than an aggregate.
 */
async function groupPapersByCommittee(conferenceId: string): Promise<CommitteeGroup[]> {
	const papers = await db.query.paper.findMany({
		where: { conferenceId, status: { ne: 'DRAFT' } },
		with: { agendaItem: { with: { committee: true } } }
	});

	const byCommittee = new Map<
		string,
		{ committee: CommitteeRow; items: Map<string, AgendaItemGroup> }
	>();

	for (const paper of papers) {
		const agendaItem = paper.agendaItem;
		const committee = agendaItem?.committee;
		if (!agendaItem || !committee) continue;

		let committeeGroup = byCommittee.get(committee.id);
		if (!committeeGroup) {
			committeeGroup = { committee, items: new Map() };
			byCommittee.set(committee.id, committeeGroup);
		}

		let itemGroup = committeeGroup.items.get(agendaItem.id);
		if (!itemGroup) {
			itemGroup = { agendaItem, papers: [] };
			committeeGroup.items.set(agendaItem.id, itemGroup);
		}

		itemGroup.papers.push(paper);
	}

	return [...byCommittee.values()].map((group) => ({
		committee: group.committee,
		agendaItems: [...group.items.values()]
	}));
}

schemaBuilder.queryFields((t) => ({
	/** The reviewer-facing paper hub. */
	findPapersGroupedByCommittee: t.field({
		type: [CommitteePaperGroup],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertPaperReviewer(args.conferenceId, userId(ctx));
			return groupPapersByCommittee(args.conferenceId);
		}
	}),

	/** The same grouping for ordinary participants. */
	findGlobalPapersGroupedByCommittee: t.field({
		type: [CommitteePaperGroup],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertConferenceParticipant(args.conferenceId, userId(ctx));
			return groupPapersByCommittee(args.conferenceId);
		}
	})
}));

const ReviewerStat = schemaBuilder.simpleObject('ReviewerStat', {
	fields: (t) => ({
		anonymizedName: t.string(),
		firstReviews: t.int(),
		totalReviews: t.int(),
		isCurrentUser: t.boolean()
	})
});

const MyReviewStats = schemaBuilder.simpleObject('MyReviewStats', {
	fields: (t) => ({
		firstReviews: t.int(),
		followUpReviews: t.int(),
		totalReviews: t.int()
	})
});

/**
 * Every review of the conference in the order they were written.
 *
 * The tiebreaker on `id` keeps the "who reviewed this paper first" attribution stable across
 * calls when two reviews share a timestamp.
 */
async function fetchConferenceReviews(conferenceId: string) {
	return db.query.paperReview.findMany({
		where: { paperVersion: { paper: { conferenceId } } },
		columns: { id: true, reviewerId: true, createdAt: true },
		with: { paperVersion: { columns: { paperId: true } } },
		orderBy: { createdAt: 'asc', id: 'asc' }
	});
}

schemaBuilder.queryFields((t) => ({
	/** Top ten reviewers of a conference, ranked by how often they got to a paper first. */
	reviewerLeaderboard: t.field({
		type: [ReviewerStat],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const callerId = userId(ctx);
			await assertPaperReviewer(args.conferenceId, callerId);

			const reviews = await fetchConferenceReviews(args.conferenceId);

			const paperFirstReviewer = new Map<string, string>();
			const reviewerStats = new Map<string, { first: number; total: number }>();

			for (const review of reviews) {
				const paperId = review.paperVersion.paperId;
				const reviewerId = review.reviewerId;

				const stats = reviewerStats.get(reviewerId) ?? { first: 0, total: 0 };
				reviewerStats.set(reviewerId, stats);
				stats.total++;

				if (!paperFirstReviewer.has(paperId)) {
					paperFirstReviewer.set(paperId, reviewerId);
					stats.first++;
				}
			}

			return [...reviewerStats.entries()]
				.map(([id, stats]) => ({
					anonymizedName: codenmz(id),
					firstReviews: stats.first,
					totalReviews: stats.total,
					isCurrentUser: id === callerId
				}))
				.sort((a, b) => b.firstReviews - a.firstReviews)
				.slice(0, 10);
		}
	}),

	/** The caller's own review counts. Null rather than an error when they are not a reviewer. */
	myReviewStats: t.field({
		type: MyReviewStats,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) return null;

			const teamMember = await db.query.teamMember.findFirst({
				where: {
					conferenceId: args.conferenceId,
					userId: callerId,
					role: { in: [...PAPER_ROLES] }
				}
			});
			if (!teamMember) return null;

			const reviews = await fetchConferenceReviews(args.conferenceId);

			const paperFirstReviewer = new Map<string, string>();
			const countedFirstReviewPapers = new Set<string>();
			let firstReviews = 0;
			let totalReviews = 0;

			for (const review of reviews) {
				const paperId = review.paperVersion.paperId;
				const reviewerId = review.reviewerId;

				if (!paperFirstReviewer.has(paperId)) {
					paperFirstReviewer.set(paperId, reviewerId);
				}

				if (reviewerId !== callerId) continue;

				totalReviews++;
				if (
					paperFirstReviewer.get(paperId) === callerId &&
					!countedFirstReviewPapers.has(paperId)
				) {
					countedFirstReviewPapers.add(paperId);
					firstReviews++;
				}
			}

			return {
				firstReviews,
				followUpReviews: totalReviews - firstReviews,
				totalReviews
			};
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	/**
	 * The paper a reviewer should pick up next for an agenda item: the least recently touched
	 * one, with never-reviewed submissions taking precedence over revisions.
	 */
	findNextPaperToReview: t.field({
		type: PaperRef,
		args: { agendaItemId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const agendaItem = await db.query.committeeAgendaItem
				.findFirst({
					where: { id: args.agendaItemId },
					columns: {},
					with: { committee: { columns: { conferenceId: true } } }
				})
				.then(assertFindFirstExists);

			await assertPaperReviewer(agendaItem.committee.conferenceId, userId(ctx));

			const papers = await db.query.paper.findMany({
				where: { agendaItemId: args.agendaItemId, status: { in: ['SUBMITTED', 'REVISED'] } },
				orderBy: { updatedAt: 'asc' }
			});

			if (papers.length === 0) {
				throw new GraphQLError('No papers found for the specified agenda item.');
			}

			return papers.find((paper) => paper.status === 'SUBMITTED') ?? papers[0];
		}
	})
}));
