import { db, schema } from '$api/db/db';
import { abilityBuilder, countQuery, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	PAPER_ROLES,
	hasTeamRole,
	PROJECT_MANAGEMENT_ROLES,
	isInOwnDelegation,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import {
	assertConferenceParticipant,
	assertPaperReviewer,
	createPaper,
	findNextPaperToReview,
	groupPapersByCommittee,
	reviewStatsOf,
	reviewerLeaderboard,
	updatePaper,
	type AgendaItemGroup,
	type CommitteeGroup
} from './paperService';
import { CommitteeRef } from '../committee/committee';
import { CommitteeAgendaItemRef } from '../committeeAgendaItem/committeeAgendaItem';
import { assertFindFirstExists } from '@m1212e/rumble';
import { paperPubsub, paperVersionPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

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

query({ table: 'paper' });
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
			const created = await createPaper(ctx, args);

			paperPubsub.created();
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
			await updatePaper(ctx, args);

			paperPubsub.updated(args.paperId);
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
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
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
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
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

schemaBuilder.queryFields((t) => ({
	/** Top ten reviewers of a conference, ranked by how often they got to a paper first. */
	reviewerLeaderboard: t.field({
		type: [ReviewerStat],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const callerId = userId(ctx);
			await assertPaperReviewer(ctx, args.conferenceId);

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

			if (!(await hasTeamRole(ctx, args.conferenceId, PAPER_ROLES))) return null;

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
			return findNextPaperToReview(ctx, args.agendaItemId);
		}
	})
}));
