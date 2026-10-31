import type { Context } from '#api/context';
import { type Transaction, db, schema } from '#api/db/db';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { translatePaperStatus } from '#lib/utils/enumTranslations';
import { apiError } from '#api/services/errors';
import { splitRole } from '#lib/helpers/conferenceRole';
import { z } from 'zod';
import { paperPubsub, paperReviewPubsub, paperVersionPubsub } from '#api/pubsub';

/** The flag piece a first review uncovered; mirrors the `UnlockedPieceData` GraphQL object. */
type UnlockedPiece = {
	flagId: string;
	flagName: string;
	flagType: 'NATION' | 'NSA';
	flagAlpha2Code: string | null;
	flagAlpha3Code: string | null;
	fontAwesomeIcon: string | null;
	pieceName: string;
	foundCount: number;
	totalCount: number;
	isComplete: boolean;
};

const REVIEWABLE_STATUSES = ['SUBMITTED', 'REVISED', 'CHANGES_REQUESTED', 'ACCEPTED'];

/** The verdicts a review may give. */
export const reviewVerdictSchema = z.enum(['CHANGES_REQUESTED', 'ACCEPTED'], {
	error: (issue) => m.reviewInvalidStatus({ status: String(issue.input) })
});

/** Papers that are past draft and already carry at least one review. */
const reviewedPaperWhere = (delegationId: string) => ({
	delegationId,
	status: { ne: 'DRAFT' as const },
	versions: { reviews: {} }
});

function fetchPaperForReview({ tx, paperId }: { tx: Transaction; paperId: string }) {
	return tx.query.paper
		.findFirst({
			where: { id: paperId },
			with: {
				versions: { orderBy: { version: 'desc' }, limit: 1 },
				author: true,
				agendaItem: { with: { committee: true } },
				delegation: { with: { assignedRole: { with: { nation: true } } } },
				conference: true
			}
		})
		.then(assertFindFirstExists);
}

type PaperForReview = Awaited<ReturnType<typeof fetchPaperForReview>>;

/**
 * Rejects the review unless the paper can be reviewed. Whether the caller may review at all
 * is `assertCanReviewPaper`'s business.
 */
function assertReviewable({ paper }: { paper: PaperForReview }) {
	if (!REVIEWABLE_STATUSES.includes(paper.status)) {
		throw apiError({
			code: 'CONFLICT',
			message: m.reviewStatusNotReviewable({ status: translatePaperStatus(paper.status) })
		});
	}
	const latestVersion = paper.versions[0];
	if (!latestVersion) {
		throw apiError({ code: 'CONFLICT', message: m.reviewNoVersions() });
	}
	return latestVersion;
}

/** The committee and agenda item a paper belongs to, if it belongs to one. */
function agendaItemLabel(paper: PaperForReview) {
	return paper.agendaItem?.committee
		? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
		: undefined;
}

/** Nation delegations: one piece per agenda item, found when it has no review yet. */
async function isFirstNationPieceReview({
	tx,
	paper,
	agendaItemId
}: {
	tx: Transaction;
	paper: PaperForReview;
	agendaItemId: string;
}) {
	const existing = await tx.query.paperReview.findFirst({
		where: {
			paperVersion: { paper: { delegationId: paper.delegationId, agendaItemId } }
		},
		columns: { id: true }
	});
	return existing === undefined;
}

/**
 * Non-state actors: the introduction paper is its own piece, and the first two other papers to
 * be reviewed count one more piece each.
 */
async function isFirstNsaPieceReview({ tx, paper }: { tx: Transaction; paper: PaperForReview }) {
	const reviewedOfKind = await tx.query.paper.findMany({
		where: {
			...reviewedPaperWhere(paper.delegationId),
			type:
				paper.type === 'INTRODUCTION_PAPER' ? 'INTRODUCTION_PAPER' : { ne: 'INTRODUCTION_PAPER' }
		},
		columns: { id: true }
	});
	if (paper.type === 'INTRODUCTION_PAPER') return reviewedOfKind.length === 0;
	if (reviewedOfKind.length >= 2) return false;

	const existing = await tx.query.paperReview.findFirst({
		where: { paperVersion: { paperId: paper.id } },
		columns: { id: true }
	});
	return existing === undefined;
}

/** Whether this review, written before it is inserted, finds a new piece of the flag. */
function isFirstReviewForPiece({ tx, paper }: { tx: Transaction; paper: PaperForReview }) {
	const kind = paper.delegation?.assignedRole?.kind;
	if (kind === 'NATION' && paper.agendaItemId) {
		return isFirstNationPieceReview({ tx, paper, agendaItemId: paper.agendaItemId });
	}
	if (kind === 'NON_STATE_ACTOR') {
		return isFirstNsaPieceReview({ tx, paper });
	}
	return false;
}

async function nationPiece({
	tx,
	paper,
	roleId,
	nation
}: {
	tx: Transaction;
	paper: PaperForReview;
	roleId: string;
	nation: { alpha2Code: string; alpha3Code: string };
}): Promise<UnlockedPiece> {
	const committees = await tx.query.committee.findMany({
		where: { conferenceId: paper.delegation.conferenceId, roles: { id: roleId } },
		with: { agendaItems: { columns: { id: true } } }
	});
	const totalPieces = committees.reduce((sum, committee) => sum + committee.agendaItems.length, 0);
	const found = await tx.query.paper.findMany({
		where: {
			...reviewedPaperWhere(paper.delegationId),
			agendaItemId: { isNotNull: true }
		},
		columns: { id: true }
	});
	return {
		flagId: nation.alpha3Code,
		// The client translates the code into a display name.
		flagName: nation.alpha3Code,
		flagType: 'NATION',
		flagAlpha2Code: nation.alpha2Code,
		flagAlpha3Code: nation.alpha3Code,
		fontAwesomeIcon: null,
		pieceName: agendaItemLabel(paper) ?? m.paperPieceFallback(),
		foundCount: found.length,
		totalCount: totalPieces,
		isComplete: found.length >= totalPieces
	};
}

const NSA_PIECE_COUNT = 3;

async function nsaPiece({
	tx,
	paper,
	nsa
}: {
	tx: Transaction;
	paper: PaperForReview;
	nsa: { id: string; name: string | null; fontAwesomeIcon: string | null };
}): Promise<UnlockedPiece> {
	const found = await tx.query.paper.findMany({
		where: reviewedPaperWhere(paper.delegationId),
		columns: { id: true }
	});
	return {
		flagId: nsa.id,
		flagName: nsa.name ?? '',
		flagType: 'NSA',
		flagAlpha2Code: null,
		flagAlpha3Code: null,
		fontAwesomeIcon: nsa.fontAwesomeIcon,
		pieceName:
			paper.type === 'INTRODUCTION_PAPER'
				? m.paperTypeIntroductionPaper()
				: (agendaItemLabel(paper) ?? m.paperPieceNumbered({ number: found.length })),
		foundCount: Math.min(found.length, NSA_PIECE_COUNT),
		totalCount: NSA_PIECE_COUNT,
		isComplete: found.length >= NSA_PIECE_COUNT
	};
}

/** The flag piece a first review just uncovered, counted after the review was written. */
async function unlockedPiece({ tx, paper }: { tx: Transaction; paper: PaperForReview }) {
	const role = paper.delegation?.assignedRole;
	const { nation, nonStateActor } = splitRole(role);
	if (role && nation) return nationPiece({ tx, paper, roleId: role.id, nation });
	if (nonStateActor) return nsaPiece({ tx, paper, nsa: nonStateActor });
	return null;
}

type Reviewer = Pick<ReturnType<Context['mustBeLoggedIn']>, 'sub'>;

/**
 * Records a reviewer's verdict on a paper's latest version.
 *
 * Besides writing the review it advances the paper and version status and works out whether this was the first review for a "piece" of the flag collection - the
 * gamified progress display. That last part has three shapes: a nation delegation counts one
 * piece per agenda item, a non-state actor's introduction paper is its own piece, and its
 * other papers count up to two more.
 */
export async function createPaperReview({
	args,
	reviewer
}: {
	args: {
		paperId: string;
		comments?: (typeof schema.paperReview.$inferInsert)['comments'];
		newStatus: z.output<typeof reviewVerdictSchema>;
	};
	reviewer: Reviewer;
}) {
	const { paper, versionId, result } = await db.transaction(async (tx) => {
		const paper = await fetchPaperForReview({ tx, paperId: args.paperId });
		const latestVersion = assertReviewable({ paper });
		const wasFirstReviewForPiece = await isFirstReviewForPiece({ tx, paper });

		const review = await tx
			.insert(schema.paperReview)
			.values({
				comments: args.comments ?? {},
				paperVersionId: latestVersion.id,
				reviewerId: reviewer.sub,
				statusBefore: paper.status,
				statusAfter: args.newStatus
			})
			.returning()
			.then(assertFirstEntryExists);

		await tx
			.update(schema.paper)
			.set({ status: args.newStatus })
			.where(whereRows({ table: schema.paper, filter: { id: args.paperId } }));
		await tx
			.update(schema.paperVersion)
			.set({ status: args.newStatus })
			.where(whereRows({ table: schema.paperVersion, filter: { id: latestVersion.id } }));

		const unlockedPieceData = wasFirstReviewForPiece ? await unlockedPiece({ tx, paper }) : null;

		return {
			paper,
			versionId: latestVersion.id,
			result: {
				reviewId: review.id,
				pieceUnlocked: wasFirstReviewForPiece && unlockedPieceData !== null,
				unlockedPieceData
			}
		};
	});
	paperReviewPubsub.created();
	paperPubsub.updated(args.paperId);
	paperVersionPubsub.updated(versionId);

	return { result, conferenceId: paper.delegation.conferenceId };
}
