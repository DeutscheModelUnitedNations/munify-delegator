import { db } from '#api/db/db';
import { countQuery, enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { callerUserId, deleteIfAllowed } from '#api/services/authHelper/utils';
import {
	authorStatusSchema,
	createPaper,
	nextPaperToReview,
	groupPapersByCommittee,
	newPaperStatusSchema,
	reviewStatsOf,
	reviewerLeaderboard,
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
	registerPaperAbilities,
	supervisedDelegationOf
} from './paperPermissions';
import { CommitteeRef } from '../committee/committee';
import { CommitteeAgendaItemRef } from '../committeeAgendaItem/committeeAgendaItem';
import { assertFindFirstExists } from '@m1212e/rumble';
import { paperPubsub, paperReviewPubsub, paperVersionPubsub } from '#api/pubsub';

registerPaperAbilities();

const PaperRef = object({ table: 'paper' });

// `paper(id)` is the single paper view's query, for authors, the paper team and the participants
// alike: the read ability decides who gets which paper.
query({ table: 'paper' });
countQuery({ table: 'paper' }); // generates `papersCount(where)`, which the team dashboard's card shows
const paperTypeEnum = enum_({ tsName: 'paperType' });
const paperStatusEnum = enum_({ tsName: 'paperStatus' });

/** The paper with this id, as far as the caller may read it. */
const readablePaper = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.paper.filter('read')).merge({ where: { id } }).query.single;

/** The submitted papers of a conference matching `where`, as far as the caller may read them. */
const readableSubmittedPapers = async ({
	ctx,
	conferenceId,
	where = {}
}: {
	ctx: ApiContext;
	conferenceId: string;
	where?: object;
}) =>
	(await ctx.abilities.paper.filter('read')).merge({
		where: { delegation: { conferenceId }, status: { ne: 'DRAFT' }, ...where }
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
			...(await readableSubmittedPapers({ ctx, conferenceId })),
			with: { agendaItem: { with: { committee: true } } }
		})
	);
}

schemaBuilder.mutationFields((t) => ({
	createPaper: t.drizzleField({
		description:
			"Writes a new paper with its first version, in the caller's name, for a delegation they are a member of, in that delegation's conference. Refused with FORBIDDEN when the delegation's role does not allow the paper type or agenda item, and with CONFLICT while the conference takes no papers.",
		type: PaperRef,
		args: {
			delegationId: t.arg.id({ required: true }),
			agendaItemId: t.arg.id({
				description: 'The agenda item it is on; left out for an introduction paper.'
			}),
			type: t.arg({ type: paperTypeEnum, required: true }),
			content: t.arg({ type: 'JSON', required: true }),
			status: t
				.arg({
					type: paperStatusEnum,
					required: true,
					description: 'DRAFT to keep working on it, SUBMITTED to hand it in.'
				})
				.validate(newPaperStatusSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			const { authorParticipantId, conferenceId } = await assertCanCreatePaper({ ctx, args });
			const paperId = await createPaper({
				conferenceId,
				paper: {
					authorParticipantId,
					delegationId: args.delegationId,
					agendaItemId: args.agendaItemId,
					type: args.type,
					content: args.content,
					status: args.status
				}
			});

			return db.query.paper
				.findFirst(query(await readablePaper({ ctx, id: paperId })))
				.then(assertFindFirstExists);
		}
	}),

	updatePaper: t.drizzleField({
		description:
			'Saves the paper as a new version rather than editing the previous one. Its author and the paper team edit it; CONFLICT while the conference takes no papers.',
		type: PaperRef,
		args: {
			paperId: t.arg.id({ required: true }),
			content: t.arg({ type: 'JSON', required: true }),
			status: t
				.arg({
					type: paperStatusEnum,
					description:
						"The author's DRAFT or SUBMITTED (a resubmission after a review becomes REVISED); left out keeps the paper's. Only the author sets it (FORBIDDEN for the paper team, whose verdicts go through reviews)."
				})
				.validate(authorStatusSchema.nullish())
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdatePaper({ ctx, paperId: args.paperId, status: args.status });
			await updatePaper({ paperId: args.paperId, content: args.content, status: args.status });

			return db.query.paper
				.findFirst(query(await readablePaper({ ctx, id: args.paperId })))
				.then(assertFindFirstExists);
		}
	}),

	deletePaper: t.field({
		description:
			'Deletes a paper with all its versions and reviews: its author while it is a draft, project management any time.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'paper', id: args.id });
			// Its versions and their reviews went with it
			paperPubsub.removed();
			paperVersionPubsub.removed();
			paperReviewPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	findIntroductionPapers: t.drizzleField({
		description:
			"Introduction papers are the ones with no agenda item - a non-state actor writes one per conference rather than one per topic. For the reviewer hub and the participants' paper view alike; the read ability decides which papers each of them gets. FORBIDDEN for anyone without a part in the conference.",
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanReadConferencePapers({ ctx, conferenceId: args.conferenceId });

			return db.query.paper.findMany(
				query(
					await readableSubmittedPapers({
						ctx,
						conferenceId: args.conferenceId,
						where: { agendaItemId: { isNull: true } }
					})
				)
			);
		}
	}),

	findSupervisedPapers: t.drizzleField({
		description:
			'The submitted papers of the delegations with a member the caller supervises; empty for anyone else.',
		type: [PaperRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const callerId = ctx.mustBeLoggedIn().sub;

			return db.query.paper.findMany(
				query(
					await readableSubmittedPapers({
						ctx,
						conferenceId: args.conferenceId,
						where: supervisedDelegationOf(callerId)
					})
				)
			);
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
			"The conference's submitted papers by committee and agenda item, for the paper team and participants alike; the read ability decides which papers each of them gets. FORBIDDEN for anyone without a part in the conference.",
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
			'Top ten reviewers of a conference, ranked by how often they got to a paper first, under anonymised names. For the paper team only (FORBIDDEN otherwise).',
		type: [ReviewerStat],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReviewPapers({ ctx, conferenceId: args.conferenceId });

			return reviewerLeaderboard({ conferenceId: args.conferenceId, callerId: callerUserId(ctx) });
		}
	}),

	myReviewStats: t.field({
		description:
			"The caller's own review counts. Null rather than an error when they are not on the conference's paper team.",
		type: MyReviewStats,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const callerId = callerUserId(ctx);
			if (!callerId) return null;

			if (!(await canReviewPapers({ ctx, conferenceId: args.conferenceId }))) return null;

			return reviewStatsOf({ conferenceId: args.conferenceId, callerId });
		}
	}),

	findNextPaperToReview: t.drizzleField({
		description:
			'The paper a reviewer should pick up next for an agenda item: the least recently touched one, with never-reviewed submissions taking precedence over revisions. NOT_FOUND when none waits for a review. For the paper team only (FORBIDDEN otherwise).',
		type: PaperRef,
		args: { agendaItemId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanReviewAgendaItemPapers({ ctx, agendaItemId: args.agendaItemId });
			const paperId = await nextPaperToReview(args.agendaItemId);

			return db.query.paper
				.findFirst(query(await readablePaper({ ctx, id: paperId })))
				.then(assertFindFirstExists);
		}
	})
}));
