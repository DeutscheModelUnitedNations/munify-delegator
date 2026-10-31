import { enum_, object, schemaBuilder } from '#api/rumble';
import { createPaperReview, reviewVerdictSchema } from './paperReviewService';
import { assertCanReviewPaper, registerPaperReviewAbilities } from './paperReviewPermissions';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';

registerPaperReviewAbilities();

object({ table: 'paperReview' });
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
	createPaperReview: t.field({
		description:
			"Records a reviewer's verdict on a paper's latest version. Besides writing the review it advances the paper and version status, has the author told (the `PAPER_REVIEWED` mail, where the conference sends it) and works out whether this was the first review for a \"piece\" of the flag collection - the gamified progress display. That last part has three shapes: a nation delegation counts one piece per agenda item, a non-state actor's introduction paper is its own piece, and its other papers count up to two more.",
		type: CreatePaperReviewResult,
		args: {
			paperId: t.arg.id({ required: true }),
			comments: t.arg({ type: 'JSON', required: true }),
			newStatus: t.arg({ type: paperStatusEnum, required: true }).validate(reviewVerdictSchema)
		},
		resolve: async (_root, args, ctx) => {
			const reviewer = ctx.mustBeLoggedIn();
			await assertCanReviewPaper({ ctx, paperId: args.paperId });
			const { result, conferenceId } = await createPaperReview({ args, reviewer });

			// After the commit, so a rollback never leaves the author a mail about it.
			scheduleEmailSweep({ conferenceId, origin: ctx.requestUrl().origin });

			return result;
		}
	})
}));
