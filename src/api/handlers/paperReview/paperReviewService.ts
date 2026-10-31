import { type Transaction, db, schema } from '#api/db/db';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { translatePaperStatus } from '#lib/utils/enumTranslations';
import { apiError } from '#api/services/errors';
import { z } from 'zod';
import { paperPubsub, paperReviewPubsub, paperVersionPubsub } from '#api/pubsub';
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

/** Refuses (CONFLICT) a draft or a paper without a version; returns the version to review. */
function assertReviewable({ paper }: { paper: Awaited<ReturnType<typeof fetchPaperForReview>> }) {
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
 * that status. Refuses (CONFLICT) a paper that is still a draft. Returns the review's id and the
 * flag piece the review uncovered (`flagPieces.ts`), if it was the first for one.
 */
export async function createPaperReview({
	paperId,
	comments,
	verdict,
	reviewerId
}: {
	paperId: string;
	comments: (typeof schema.paperReview.$inferInsert)['comments'];
	verdict: z.output<typeof reviewVerdictSchema>;
	reviewerId: string;
}) {
	const { versionId, result } = await db.transaction(async (tx) => {
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
				statusAfter: verdict
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

		const unlockedPieceData = wasFirstReviewForPiece ? await unlockedPiece({ tx, paper }) : null;

		return {
			versionId: latestVersion.id,
			result: {
				reviewId: review.id,
				pieceUnlocked: unlockedPieceData !== null,
				unlockedPieceData
			}
		};
	});
	paperReviewPubsub.created();
	paperPubsub.updated(paperId);
	paperVersionPubsub.updated(versionId);

	return result;
}
