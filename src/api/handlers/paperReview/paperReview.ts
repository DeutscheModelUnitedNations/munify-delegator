import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import { PAPER_ROLES, systemAdmin, userId } from '$api/services/authHelper';
import { createPaperReview } from './paperReviewService';
import { paperPubsub, paperReviewPubsub, paperVersionPubsub } from '$api/pubsub';

// Ported from abilities/entities/paper/paperReview.ts
abilityBuilder.paperReview.allow(['read', 'update', 'delete']).when(systemAdmin);

abilityBuilder.paperReview.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { paperVersion: { paper: { author: { id } } } } } : undefined;
});

abilityBuilder.paperReview.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					paperVersion: {
						paper: {
							conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } }
						}
					}
				}
			}
		: undefined;
});

object({ table: 'paperReview' });
query({ table: 'paperReview' });
const paperStatusEnum = enum_({ tsName: 'paperStatus' });

/** Which kind of flag a newly found piece belongs to. */
const FlagTypeForUnlock = schemaBuilder.enumType('FlagTypeForUnlock', {
	values: ['NATION', 'NSA'] as const
});

const UnlockedPieceData = schemaBuilder.simpleObject('UnlockedPieceData', {
	fields: (t) => ({
		flagId: t.string(),
		flagName: t.string(),
		flagType: t.field({ type: FlagTypeForUnlock }),
		flagAlpha2Code: t.string({ nullable: true }),
		flagAlpha3Code: t.string({ nullable: true }),
		fontAwesomeIcon: t.string({ nullable: true }),
		pieceName: t.string(),
		foundCount: t.int(),
		totalCount: t.int(),
		isComplete: t.boolean()
	})
});

const CreatePaperReviewResult = schemaBuilder.simpleObject('CreatePaperReviewResult', {
	fields: (t) => ({
		reviewId: t.string(),
		pieceUnlocked: t.boolean(),
		unlockedPieceData: t.field({ type: UnlockedPieceData, nullable: true })
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Records a reviewer's verdict on a paper's latest version.
	 *
	 * Besides writing the review it advances the paper and version status, emails the author, and
	 * works out whether this was the first review for a "piece" of the flag collection - the
	 * gamified progress display. That last part has three shapes: a nation delegation counts one
	 * piece per agenda item, a non-state actor's introduction paper is its own piece, and its
	 * other papers count up to two more.
	 */
	createPaperReview: t.field({
		type: CreatePaperReviewResult,
		args: {
			paperId: t.arg.id({ required: true }),
			comments: t.arg({ type: 'JSON', required: true }),
			newStatus: t.arg({ type: paperStatusEnum, required: true })
		},
		resolve: async (_root, args, ctx) => {
			const result = await createPaperReview(ctx, args);

			// After the commit, so subscribers refetch the review rather than the state before it.
			paperReviewPubsub.created();
			paperPubsub.updated(args.paperId);
			paperVersionPubsub.updated();

			return result;
		}
	})
}));
