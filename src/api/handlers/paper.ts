import { db, schema } from '$api/db/db';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PAPER_ROLES,
	assertTeamRole,
	hasTeamRole,
	PROJECT_MANAGEMENT_ROLES,
	isInOwnDelegation,
	isSystemAdmin,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';
import { fetchUserParticipations } from '$api/services/participation';
import { paperSubmissionChanges } from '$api/services/paperSubmission';
import type { Row } from '$api/db/rows';
import type { Context } from '$api/context';
import { CommitteeRef } from './committee';
import { CommitteeAgendaItemRef } from './committeeAgendaItem';
import type { InferSelectModel } from 'drizzle-orm';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';
import codenmz from '$lib/helpers/codenamize';

const paperTeam = (id: string) => ({
	teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } }
});

// Ported from abilities/entities/paper/paper.ts
abilityBuilder.paper.allow(['read', 'update', 'delete']).when(systemAdmin);

// Authors see and edit their own papers, and may delete one while it is still a draft.
abilityBuilder.paper.allow(['read', 'update']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { author: { id } } } : undefined;
});
abilityBuilder.paper.allow('delete').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { author: { id }, status: 'DRAFT' } } : undefined;
});

// Reviewers and conference management see the conference's papers and may edit their text (the
// reviewer edit mode); verdicts go through reviews.
abilityBuilder.paper.allow(['read', 'update']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { conference: paperTeam(id) } } : undefined;
});

// Only project management deletes somebody else's paper.
abilityBuilder.paper
	.allow('delete')
	.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

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

// Delegates see the submitted papers of their own delegation - nobody else's.
abilityBuilder.paper.allow('read').when((ctx) => {
	const delegation = isInOwnDelegation(ctx);
	return delegation ? { where: { ...delegation, status: { ne: 'DRAFT' } } } : undefined;
});

const PaperRef = object({ table: 'paper' });

/**
 * A paper is written by the caller, for a delegation they are a member of in that conference, on
 * one of that conference's agenda items (or none, for an introduction paper). All three arrive as
 * arguments, so all three are checked: the author cannot be somebody else, and the delegation and
 * agenda item cannot belong to another conference.
 */
/** What an author may ask for; ACCEPTED and CHANGES_REQUESTED are verdicts, set by reviews. */
const AUTHOR_STATUSES: readonly Row<'paper'>['status'][] = ['DRAFT', 'SUBMITTED', 'REVISED'];

/**
 * Refuses a status a save may not set. Authors move between draft and submitted; a reviewer
 * editing the text keeps whatever verdict the paper already has. Neither may hand out a verdict.
 */
function assertSavableStatus(
	requested: Row<'paper'>['status'] | null | undefined,
	current?: Row<'paper'>['status']
) {
	if (!requested || requested === current || AUTHOR_STATUSES.includes(requested)) return;
	throw new GraphQLError('A paper can only be accepted or sent back through a review');
}

async function assertMayAuthor(
	ctx: Context,
	args: {
		conferenceId: string;
		authorId: string;
		delegationId: string;
		agendaItemId?: string | null;
	}
) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (args.authorId !== caller) {
		throw new GraphQLError('Papers can only be written in your own name');
	}
	const membership = await db.query.delegationMember.findFirst({
		where: { userId: caller, delegationId: args.delegationId, conferenceId: args.conferenceId },
		columns: { id: true }
	});
	if (!membership) {
		throw new GraphQLError('You can only write papers for your own delegation');
	}
	if (args.agendaItemId) {
		await db.query.committeeAgendaItem
			.findFirst({
				where: { id: args.agendaItemId, committee: { conferenceId: args.conferenceId } },
				columns: { id: true }
			})
			.then(assertFindFirstExists);
	}
}
query({ table: 'paper' });
const pubsub = rumblePubsub({ table: 'paper' });
// Every content change is a new version row rather than an edit in place.
const paperVersionPubsub = rumblePubsub({ table: 'paperVersion' });

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
			await assertMayAuthor(ctx, args);
			assertSavableStatus(args.status);
			// REVISED answers a review, and a new paper has had none.
			if (args.status === 'REVISED') {
				throw new GraphQLError('A new paper is either a draft or a submission');
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

			pubsub.created();
			paperVersionPubsub.created();

			return db.query.paper
				.findFirst(
					query(
						(await ctx.abilities.paper.filter('read')).merge({ where: { id: created.id } }).query
							.single
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
						...(await ctx.abilities.paper.filter('update')).merge({ where: { id: args.paperId } })
							.query.single,
						with: { versions: { with: { reviews: true } }, conference: true }
					})
					.then(assertFindFirstExists);

				if (!paper.conference?.isOpenPaperSubmission) {
					throw new GraphQLError(m.paperSubmissionClosed());
				}
				assertSavableStatus(args.status, paper.status);

				const { status, firstSubmittedAt } = paperSubmissionChanges(paper, args.status, new Date());

				await tx
					.update(schema.paper)
					.set({ status, firstSubmittedAt, updatedAt: new Date() })
					.where(eq(schema.paper.id, args.paperId));

				await tx.insert(schema.paperVersion).values({
					paperId: args.paperId,
					content: args.content,
					status,
					version: paper.versions.length + 1
				});
			});

			pubsub.updated(args.paperId);
			paperVersionPubsub.created();

			return db.query.paper
				.findFirst(
					query(
						(await ctx.abilities.paper.filter('read')).merge({ where: { id: args.paperId } }).query
							.single
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
				.where(
					(await ctx.abilities.paper.filter('delete')).merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.paper.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Paper not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
		}
	})
}));

/** Reviewers and conference management of the conference, or a system admin. */
export function assertPaperReviewer(ctx: Context, conferenceId: string) {
	return assertTeamRole(ctx, conferenceId, PAPER_ROLES);
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
			await assertPaperReviewer(ctx, args.conferenceId);

			return db.query.paper.findMany(
				query(
					(await ctx.abilities.paper.filter('read')).merge({
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
					(await ctx.abilities.paper.filter('read')).merge({
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

/** Any participant of the conference - delegate, single participant or supervisor - or an admin. */
async function assertConferenceParticipant(ctx: Context, conferenceId: string) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (isSystemAdmin(ctx)) return;
	const { foundDelegationMember, foundSingleParticipant, foundSupervisor } =
		await fetchUserParticipations({ conferenceId, userId: caller });
	if (![foundDelegationMember, foundSingleParticipant, foundSupervisor].some(Boolean)) {
		throw new GraphQLError('Access denied - requires conference participant status');
	}
}

schemaBuilder.queryFields((t) => ({
	/** Introduction papers as any participant may see them, not just reviewers. */
	findGlobalIntroductionPapers: t.drizzleField({
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertConferenceParticipant(ctx, args.conferenceId);

			return db.query.paper.findMany(
				query(
					(await ctx.abilities.paper.filter('read')).merge({
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
	 * A single paper for the public paper view: exactly what the read ability allows - authors and
	 * reviewers in any state, participants of the conference once it is no longer a draft.
	 */
	findPublicPaperContent: t.drizzleField({
		type: PaperRef,
		args: { paperId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			ctx.mustBeLoggedIn();
			return db.query.paper
				.findFirst(
					query(
						(await ctx.abilities.paper.filter('read')).merge({ where: { id: args.paperId } }).query
							.single
					)
				)
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
			// Groups are keyed by agenda item, so there is always one - papers without an agenda
			// item are introduction papers and have their own query.
			agendaItem: t.field({
				type: CommitteeAgendaItemRef,
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
function groupPapersByCommittee(
	papers: (PaperRow & {
		agendaItem: (AgendaItemRow & { committee: CommitteeRow | null }) | null;
	})[]
): CommitteeGroup[] {
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
			await assertPaperReviewer(ctx, args.conferenceId);
			return groupPapersByCommittee(
				await db.query.paper.findMany({
					...(await ctx.abilities.paper.filter('read')).merge({
						where: { conferenceId: args.conferenceId, status: { ne: 'DRAFT' } }
					}).query.many,
					with: { agendaItem: { with: { committee: true } } }
				})
			);
		}
	}),

	/** The same grouping for ordinary participants. */
	findGlobalPapersGroupedByCommittee: t.field({
		type: [CommitteePaperGroup],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertConferenceParticipant(ctx, args.conferenceId);
			return groupPapersByCommittee(
				await db.query.paper.findMany({
					...(await ctx.abilities.paper.filter('read')).merge({
						where: { conferenceId: args.conferenceId, status: { ne: 'DRAFT' } }
					}).query.many,
					with: { agendaItem: { with: { committee: true } } }
				})
			);
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
			await assertPaperReviewer(ctx, args.conferenceId);

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

			if (!(await hasTeamRole(ctx, args.conferenceId, PAPER_ROLES))) return null;

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

			await assertPaperReviewer(ctx, agendaItem.committee.conferenceId);

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
