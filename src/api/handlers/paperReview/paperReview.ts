import { enum_, object, query, schemaBuilder } from '#api/rumble.js';
import { createPaperReview } from './paperReviewService';
import { assertCanReviewPaper, registerPaperReviewAbilities } from './paperReviewPermissions';
import { paperPubsub, paperReviewPubsub, paperVersionPubsub } from '#api/pubsub.js';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep.js';

registerPaperReviewAbilities();

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
	 * Besides writing the review it advances the paper and version status, has the author told
	 * (the `PAPER_REVIEWED` mail, where the conference sends it) and works out whether this was
	 * the first review for a "piece" of the flag collection - the gamified progress display. That last part has three shapes: a nation delegation counts one
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
			const reviewer = ctx.mustBeLoggedIn();
			await assertCanReviewPaper(ctx, args.paperId);
			const { result, conferenceId } = await createPaperReview(args, reviewer);

			// After the commit, so subscribers refetch the review rather than the state before it,
			// and a rollback never leaves the author a mail about it.
			paperReviewPubsub.created();
			paperPubsub.updated(args.paperId);
			paperVersionPubsub.updated();
			scheduleEmailSweep(conferenceId, ctx.requestUrl().origin);

			return result;
		}
	})
}));
