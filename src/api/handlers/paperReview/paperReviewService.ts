import { type Transaction, db, schema } from '#api/db/db';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { translatePaperStatus } from '#lib/utils/enumTranslations';
import { apiError } from '#api/services/errors';
import { z } from 'zod';
import {
	paperPubsub,
	paperReviewDraftPubsub,
	paperReviewPubsub,
	paperVersionPubsub
} from '#api/pubsub';
import { isFirstReviewForPiece, unlockedPiece } from './flagPieces';

type PaperStatus = (typeof schema.paper.$inferSelect)['status'];

/** A paper can be reviewed once it is out: drafts are the author's alone. */
const REVIEWABLE_STATUSES: readonly PaperStatus[] = [
	'SUBMITTED',
	'REVISED',
	'CHANGES_REQUESTED',
	'ACCEPTED'
];

/** The verdicts a review may give. */
export const reviewVerdictSchema = z.enum(['CHANGES_REQUESTED', 'ACCEPTED'], {
	error: (issue) => m.reviewInvalidStatus({ status: String(issue.input) })
});

/**
 * The name a reviewer types to publish a review under (`anonymousAs: CUSTOM`). The argument's
 * validator runs when the argument is left out too, so it lets an absent name through;
 * whether one is needed is `reviewAnonymityArgsSchema`'s to say.
 */
export const reviewAnonymousNameSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.reviewAnonymousNameRequired() })
	.max(80, { error: () => m.reviewAnonymousNameTooLong({ max: 80 }) })
	.nullish();

/** A typed name comes with `CUSTOM` and only with it. */
export const reviewAnonymityArgsSchema = z
	.looseObject({ anonymousAs: z.string().nullish(), anonymousName: z.string().nullish() })
	.refine((args) => (args.anonymousAs === 'CUSTOM') === (args.anonymousName != null), {
		error: () => m.reviewAnonymousNameRequired(),
		path: ['anonymousName']
	});

/** The paper with its latest version and what the flag pieces are worked out from. */
function fetchPaperForReview({ tx, paperId }: { tx: Transaction; paperId: string }) {
	return tx.query.paper
		.findFirst({
			where: { id: paperId },
			with: {
				versions: { orderBy: { version: 'desc' }, limit: 1, columns: { id: true } },
				agendaItem: { with: { committee: true } },
				delegation: { with: { assignedRole: { with: { nation: true } } } }
			}
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses (CONFLICT) a draft or a paper without a version; returns the version to review, the
 * first of `versions`, which are loaded newest first. Review drafts check the same.
 */
export function assertReviewable<V>({
	paper
}: {
	paper: { status: PaperStatus; versions: readonly V[] };
}) {
	if (!REVIEWABLE_STATUSES.includes(paper.status)) {
		throw apiError({
			code: 'CONFLICT',
			message: m.reviewStatusNotReviewable({ status: translatePaperStatus(paper.status) })
		});
	}
	const latestVersion = paper.versions.at(0);
	if (!latestVersion) {
		throw apiError({ code: 'CONFLICT', message: m.reviewNoVersions() });
	}
	return latestVersion;
}

/**
 * Records a reviewer's verdict on a paper's latest version and gives the paper and the version
 * that status; with `anonymousAs` the author reads that name (`anonymousName` for `CUSTOM`) instead of the reviewer's. The reviewer's review draft of the paper, if any, is deleted with it. Refuses (CONFLICT) a paper that is still a draft. Returns the review's id and the
 * flag piece the review uncovered (`flagPieces.ts`), if it was the first for one.
 */
export async function createPaperReview({
	paperId,
	comments,
	verdict,
	reviewerId,
	anonymousAs,
	anonymousName
}: {
	paperId: string;
	comments: (typeof schema.paperReview.$inferInsert)['comments'];
	verdict: z.output<typeof reviewVerdictSchema>;
	reviewerId: string;
	anonymousAs: (typeof schema.paperReview.$inferInsert)['anonymousAs'];
	anonymousName: (typeof schema.paperReview.$inferInsert)['anonymousName'];
}) {
	const { versionId, draftDeleted, result } = await db.transaction(async (tx) => {
		const paper = await fetchPaperForReview({ tx, paperId });
		const latestVersion = assertReviewable({ paper });
		const wasFirstReviewForPiece = await isFirstReviewForPiece({ tx, paper });

		const review = await tx
			.insert(schema.paperReview)
			.values({
				comments,
				paperVersionId: latestVersion.id,
				reviewerId,
				statusBefore: paper.status,
				statusAfter: verdict,
				anonymousAs,
				anonymousName
			})
			.returning({ id: schema.paperReview.id })
			.then(assertFirstEntryExists);

		await tx
			.update(schema.paper)
			.set({ status: verdict })
			.where(whereRows({ table: schema.paper, filter: { id: paperId } }));
		await tx
			.update(schema.paperVersion)
			.set({ status: verdict })
			.where(whereRows({ table: schema.paperVersion, filter: { id: latestVersion.id } }));

		// The reviewer's draft of this review is done with (`paperReviewDraft`).
		const deletedDrafts = await tx
			.delete(schema.paperReviewDraft)
			.where(whereRows({ table: schema.paperReviewDraft, filter: { paperId, reviewerId } }))
			.returning({ id: schema.paperReviewDraft.id });

		const unlockedPieceData = wasFirstReviewForPiece ? await unlockedPiece({ tx, paper }) : null;

		return {
			versionId: latestVersion.id,
			draftDeleted: deletedDrafts.length > 0,
			result: {
				reviewId: review.id,
				pieceUnlocked: unlockedPieceData !== null,
				unlockedPieceData
			}
		};
	});
	paperReviewPubsub.created();
	if (draftDeleted) paperReviewDraftPubsub.removed();
	paperPubsub.updated(paperId);
	paperVersionPubsub.updated(versionId);
	// The verdict moves the paper into or out of lists filtered by status (the linked CHASE reads
	// accepted working papers only), which hear of it as rows coming and going, not as updates.
	paperPubsub.created();
	paperVersionPubsub.created();

	return result;
}
