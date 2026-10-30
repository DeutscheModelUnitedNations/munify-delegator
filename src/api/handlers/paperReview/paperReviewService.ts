import type { Context } from '#api/context';
import { type Transaction, db, schema } from '#api/db/db';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { translatePaperStatus } from '#lib/utils/enumTranslations';
import { apiError } from '#api/services/errors/apiError';
import { splitRole } from '#lib/helpers/conferenceRole';

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
const ALLOWED_NEW_STATUSES = ['CHANGES_REQUESTED', 'ACCEPTED'];

/** Papers that are past draft and already carry at least one review. */
const reviewedPaperWhere = (delegationId: string) => ({
	delegationId,
	status: { ne: 'DRAFT' as const },
	versions: { reviews: {} }
});

function fetchPaperForReview(tx: Transaction, paperId: string) {
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
 * Rejects the review unless the paper and verdict allow it. Whether the caller may review at all
 * is `assertCanReviewPaper`'s business.
 */
function assertReviewable(paper: PaperForReview, newStatus: string) {
	if (!REVIEWABLE_STATUSES.includes(paper.status)) {
		throw apiError(
			'CONFLICT',
			m.reviewStatusNotReviewable({ status: translatePaperStatus(paper.status) })
		);
	}
	if (!ALLOWED_NEW_STATUSES.includes(newStatus)) {
		throw apiError('INVALID_INPUT', m.reviewInvalidStatus({ status: newStatus }));
	}

	const latestVersion = paper.versions[0];
	if (!latestVersion) {
		throw apiError('CONFLICT', m.reviewNoVersions());
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
async function isFirstNationPieceReview(
	tx: Transaction,
	paper: PaperForReview,
	agendaItemId: string
) {
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
async function isFirstNsaPieceReview(tx: Transaction, paper: PaperForReview) {
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
function isFirstReviewForPiece(tx: Transaction, paper: PaperForReview) {
	const kind = paper.delegation?.assignedRole?.kind;
	if (kind === 'NATION' && paper.agendaItemId) {
		return isFirstNationPieceReview(tx, paper, paper.agendaItemId);
	}
	if (kind === 'NON_STATE_ACTOR') {
		return isFirstNsaPieceReview(tx, paper);
	}
	return false;
}

async function nationPiece(
	tx: Transaction,
	paper: PaperForReview,
	roleId: string,
	nation: { alpha2Code: string; alpha3Code: string }
): Promise<UnlockedPiece> {
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

async function nsaPiece(
	tx: Transaction,
	paper: PaperForReview,
	nsa: { id: string; name: string | null; fontAwesomeIcon: string | null }
): Promise<UnlockedPiece> {
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
async function unlockedPiece(tx: Transaction, paper: PaperForReview) {
	const role = paper.delegation?.assignedRole;
	const { nation, nonStateActor } = splitRole(role);
	if (role && nation) return nationPiece(tx, paper, role.id, nation);
	if (nonStateActor) return nsaPiece(tx, paper, nonStateActor);
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
export async function createPaperReview(
	args: {
		paperId: string;
		comments?: (typeof schema.paperReview.$inferInsert)['comments'];
		newStatus: (typeof schema.paper.$inferSelect)['status'];
	},
	reviewer: Reviewer
) {
	const { paper, result } = await db.transaction(async (tx) => {
		const paper = await fetchPaperForReview(tx, args.paperId);
		const latestVersion = assertReviewable(paper, args.newStatus);
		const wasFirstReviewForPiece = await isFirstReviewForPiece(tx, paper);

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
			.where(whereRows(schema.paper, { id: args.paperId }));
		await tx
			.update(schema.paperVersion)
			.set({ status: args.newStatus })
			.where(whereRows(schema.paperVersion, { id: latestVersion.id }));

		const unlockedPieceData = wasFirstReviewForPiece ? await unlockedPiece(tx, paper) : null;

		return {
			paper,
			result: {
				reviewId: review.id,
				pieceUnlocked: wasFirstReviewForPiece && unlockedPieceData !== null,
				unlockedPieceData
			}
		};
	});

	return { result, conferenceId: paper.delegation.conferenceId };
}
