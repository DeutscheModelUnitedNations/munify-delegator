import { db } from '#api/db/db';
import { countQuery, enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { callerUserId, deleteIfAllowed } from '#api/services/authHelper/utils';
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
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { paperPubsub } from '#api/pubsub';

registerPaperAbilities();

const PaperRef = object({ table: 'paper' });

query({ table: 'paper' });

/** The submitted introduction papers (those without an agenda item) the caller may read. */
const readableIntroductionPapers = async ({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) =>
	(await ctx.abilities.paper.filter('read')).merge({
		where: {
			delegation: { conferenceId },
			status: { ne: 'DRAFT' },
			agendaItemId: { isNull: true }
		}
	}).query.many;

/** The submitted papers of a conference the caller may read, by committee and agenda item. */
async function readablePapersGroupedByCommittee({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
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

/** The paper with this id, as far as the caller may read it. */
const readablePaper = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.paper.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createPaper: t.drizzleField({
		description: 'Writes a new paper with its first version, as a draft or submitted.',
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
		// REVISED answers a review, and a new paper has had none.
		validate: z
			.object({ status: z.string().nullish() })
			.refine((args) => args.status !== 'REVISED', {
				error: () => m.paperNewDraftOrSubmission()
			}),
		resolve: async (query, _root, args, ctx) => {
			const { authorParticipantId } = await assertCanCreatePaper({ ctx, args });
			const created = await createPaper({ ...args, authorParticipantId });

			return db.query.paper
				.findFirst(query(await readablePaper({ ctx, id: created.id })))
				.then(assertFindFirstExists);
		}
	}),

	updatePaper: t.drizzleField({
		description: 'Each update appends a new version rather than editing the previous one.',
		type: PaperRef,
		args: {
			paperId: t.arg.id({ required: true }),
			content: t.arg({ type: 'JSON', required: true }),
			status: t.arg({ type: paperStatusEnum })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdatePaper({ ctx, paperId: args.paperId });
			await updatePaper(args);

			return db.query.paper
				.findFirst(query(await readablePaper({ ctx, id: args.paperId })))
				.then(assertFindFirstExists);
		}
	}),

	deletePaper: t.field({
		description: 'Deletes a paper with all its versions and reviews.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'paper', id: args.id });
			paperPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	findIntroductionPapers: t.drizzleField({
		description:
			"Introduction papers are the ones with no agenda item - a non-state actor writes one per conference rather than one per topic. For the reviewer hub and the participants' paper view alike; the read ability decides which papers each of them gets.",
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanReadConferencePapers({ ctx, conferenceId: args.conferenceId });

			return db.query.paper.findMany(
				query(await readableIntroductionPapers({ ctx, conferenceId: args.conferenceId }))
			);
		}
	}),

	findSupervisedPapers: t.drizzleField({
		description: 'Papers of the delegations the caller supervises.',
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const callerId = ctx.mustBeLoggedIn().sub;

			const delegationIds = await supervisedDelegationIds({
				conferenceId: args.conferenceId,
				supervisorId: callerId
			});
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
	findPublicPaperContent: t.drizzleField({
		description:
			'A single paper for the public paper view: exactly what the read ability allows - authors and reviewers in any state, participants of the conference once it is no longer a draft.',
		type: PaperRef,
		args: { paperId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			ctx.mustBeLoggedIn();
			return db.query.paper
				.findFirst(query(await readablePaper({ ctx, id: args.paperId })))
				.then(assertFindFirstExists);
		}
	})
}));

const AgendaItemPaperGroup = schemaBuilder
	.objectRef<AgendaItemGroup>('AgendaItemPaperGroup')
	.implement({
		fields: (t) => ({
			agendaItem: t.field({
				description:
					'Groups are keyed by agenda item, so there is always one - papers without an agenda item are introduction papers and have their own query.',
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
	findPapersGroupedByCommittee: t.field({
		description:
			"The conference's papers by committee and agenda item, for reviewers and participants alike.",
		type: [CommitteePaperGroup],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReadConferencePapers({ ctx, conferenceId: args.conferenceId });
			return readablePapersGroupedByCommittee({ ctx, conferenceId: args.conferenceId });
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
	reviewerLeaderboard: t.field({
		description:
			'Top ten reviewers of a conference, ranked by how often they got to a paper first.',
		type: [ReviewerStat],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const callerId = callerUserId(ctx);
			await assertCanReviewPapers({ ctx, conferenceId: args.conferenceId });

			return reviewerLeaderboard({ conferenceId: args.conferenceId, callerId });
		}
	}),

	myReviewStats: t.field({
		description:
			"The caller's own review counts. Null rather than an error when they are not a reviewer.",
		type: MyReviewStats,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const callerId = callerUserId(ctx);
			if (!callerId) return null;

			if (!(await canReviewPapers({ ctx, conferenceId: args.conferenceId }))) return null;

			return reviewStatsOf({ conferenceId: args.conferenceId, callerId });
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	findNextPaperToReview: t.field({
		description:
			'The paper a reviewer should pick up next for an agenda item: the least recently touched one, with never-reviewed submissions taking precedence over revisions.',
		type: PaperRef,
		args: { agendaItemId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReviewAgendaItemPapers({ ctx, agendaItemId: args.agendaItemId });
			return findNextPaperToReview(args.agendaItemId);
		}
	})
}));
