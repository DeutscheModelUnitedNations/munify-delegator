import { enum_, object, schemaBuilder } from '#api/rumble';
import { editorDocumentSchema } from '#api/handlers/paper/paperService';
import {
	createPaperReview,
	reviewAnonymityArgsSchema,
	reviewAnonymousNameSchema,
	reviewVerdictSchema
} from './paperReviewService';
import { assertCanReviewPaper, registerPaperReviewAbilities } from './paperReviewPermissions';

registerPaperReviewAbilities();

object({ table: 'paperReview' });
const paperStatusEnum = enum_({ tsName: 'paperStatus' });
const anonymousAsEnum = enum_({ tsName: 'paperReviewAnonymousAs' });

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
		icon: t.string({ nullable: true }),
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
			"Records a reviewer's verdict on a paper's latest version. Besides writing the review it gives the paper and version that status, has the author told (the `PAPER_REVIEWED` mail, where the conference sends it) and works out whether this was the first review for a \"piece\" of the flag collection - the gamified progress display. That last part has three shapes: a nation delegation counts one piece per agenda item, a non-state actor's introduction paper is its own piece, and its other papers count up to two more. NOT_FOUND for anyone but the conference's paper team, CONFLICT for a draft.",
		type: CreatePaperReviewResult,
		args: {
			paperId: t.arg.id({ required: true }),
			comments: t.arg({ type: 'JSON', required: true }).validate(editorDocumentSchema),
			newStatus: t
				.arg({
					type: paperStatusEnum,
					required: true,
					description: 'The verdict: ACCEPTED or CHANGES_REQUESTED.'
				})
				.validate(reviewVerdictSchema),
			anonymousAs: t.arg({
				type: anonymousAsEnum,
				required: false,
				description:
					"Publishes the review under this name: its author reads it instead of the reviewer's. CUSTOM takes the name from `anonymousName`. Left out, the review carries the reviewer's name."
			}),
			anonymousName: t.arg
				.string({
					required: false,
					description: 'The name to publish under, with `anonymousAs: CUSTOM` and only with it.'
				})
				.validate(reviewAnonymousNameSchema)
		},
		validate: reviewAnonymityArgsSchema,
		resolve: async (_root, args, ctx) => {
			const { reviewerId } = await assertCanReviewPaper({ ctx, paperId: args.paperId });
			return createPaperReview({
				paperId: args.paperId,
				comments: args.comments,
				verdict: args.newStatus,
				reviewerId,
				anonymousAs: args.anonymousAs ?? null,
				anonymousName: args.anonymousName ?? null
			});
		}
	})
}));
