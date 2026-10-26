import { db, schema } from '#api/db/db.js';
import { countQuery, enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble.js';
import { userId } from '#api/services/authHelper.js';
import {
	createPaper,
	findNextPaperToReview,
	groupPapersByCommittee,
	reviewStatsOf,
	reviewerLeaderboard,
	supervisedDelegationIds,
	updatePaper,
	type AgendaItemGroup,
	type CommitteeGroup
} from './paperService';
import {
	assertCanCreatePaper,
	assertCanDeletePaper,
	assertCanReadConferencePapers,
	assertCanReviewAgendaItemPapers,
	assertCanReviewPapers,
	assertCanUpdatePaper,
	canReviewPapers,
	registerPaperAbilities
} from './paperPermissions';
import { CommitteeRef } from '../committee/committee';
import { CommitteeAgendaItemRef } from '../committeeAgendaItem/committeeAgendaItem';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { paperPubsub, paperVersionPubsub } from '#api/pubsub.js';

registerPaperAbilities();

const PaperRef = object({ table: 'paper' });

query({ table: 'paper' });

/** The paper with this id, as far as the caller may read it. */
const readablePaper = async (ctx: ApiContext, id: string) =>
	(await ctx.abilities.paper.filter('read')).merge({ where: { id } }).query.single;

/** The submitted introduction papers (those without an agenda item) the caller may read. */
const readableIntroductionPapers = async (ctx: ApiContext, conferenceId: string) =>
	(await ctx.abilities.paper.filter('read')).merge({
		where: {
			delegation: { conferenceId },
			status: { ne: 'DRAFT' },
			agendaItemId: { isNull: true }
		}
	}).query.many;

/** The submitted papers of a conference the caller may read, by committee and agenda item. */
async function readablePapersGroupedByCommittee(ctx: ApiContext, conferenceId: string) {
	return groupPapersByCommittee(
		await db.query.paper.findMany({
			...(await ctx.abilities.paper.filter('read')).merge({
				where: { delegation: { conferenceId }, status: { ne: 'DRAFT' } }
			}).query.many,
			with: { agendaItem: { with: { committee: true } } }
		})
	);
}

countQuery({ table: 'paper' }); // generates `papersCount(where)`, which the team dashboard's card shows
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
			const { authorParticipantId } = await assertCanCreatePaper(ctx, args);
			const created = await createPaper({ ...args, authorParticipantId });

			paperPubsub.created();
			paperVersionPubsub.created();

			return db.query.paper
				.findFirst(query(await readablePaper(ctx, created.id)))
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
			await assertCanUpdatePaper(ctx, args.paperId);
			await updatePaper(args);

			paperPubsub.updated(args.paperId);
			paperVersionPubsub.created();

			return db.query.paper
				.findFirst(query(await readablePaper(ctx, args.paperId)))
				.then(assertFindFirstExists);
		}
	}),

	deletePaper: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeletePaper(ctx, args.id);
			await db.delete(schema.paper).where(eq(schema.paper.id, args.id));
			paperPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	/**
	 * Introduction papers are the ones with no agenda item - a non-state actor writes one per
	 * conference rather than one per topic.
	 */
	findIntroductionPapers: t.drizzleField({
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanReviewPapers(ctx, args.conferenceId);

			return db.query.paper.findMany(
				query(await readableIntroductionPapers(ctx, args.conferenceId))
			);
		}
	}),

	/** Papers of the delegations the caller supervises. */
	findSupervisedPapers: t.drizzleField({
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const callerId = ctx.mustBeLoggedIn().sub;

			const delegationIds = await supervisedDelegationIds(args.conferenceId, callerId);
			if (delegationIds.length === 0) return [];

			return db.query.paper.findMany(
				query(
					(await ctx.abilities.paper.filter('read')).merge({
						where: {
							delegation: { conferenceId: args.conferenceId },
							delegationId: { in: delegationIds },
							status: { ne: 'DRAFT' }
						}
					}).query.many
				)
			);
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	/** Introduction papers as any participant may see them, not just reviewers. */
	findGlobalIntroductionPapers: t.drizzleField({
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanReadConferencePapers(ctx, args.conferenceId);

			return db.query.paper.findMany(
				query(await readableIntroductionPapers(ctx, args.conferenceId))
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
				.findFirst(query(await readablePaper(ctx, args.paperId)))
				.then(assertFindFirstExists);
		}
	})
}));

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

schemaBuilder.queryFields((t) => ({
	/** The reviewer-facing paper hub. */
	findPapersGroupedByCommittee: t.field({
		type: [CommitteePaperGroup],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReviewPapers(ctx, args.conferenceId);
			return readablePapersGroupedByCommittee(ctx, args.conferenceId);
		}
	}),

	/** The same grouping for ordinary participants. */
	findGlobalPapersGroupedByCommittee: t.field({
		type: [CommitteePaperGroup],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReadConferencePapers(ctx, args.conferenceId);
			return readablePapersGroupedByCommittee(ctx, args.conferenceId);
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

schemaBuilder.queryFields((t) => ({
	/** Top ten reviewers of a conference, ranked by how often they got to a paper first. */
	reviewerLeaderboard: t.field({
		type: [ReviewerStat],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const callerId = userId(ctx);
			await assertCanReviewPapers(ctx, args.conferenceId);

			return reviewerLeaderboard(args.conferenceId, callerId);
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

			if (!(await canReviewPapers(ctx, args.conferenceId))) return null;

			return reviewStatsOf(args.conferenceId, callerId);
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
			await assertCanReviewAgendaItemPapers(ctx, args.agendaItemId);
			return findNextPaperToReview(args.agendaItemId);
		}
	})
}));
