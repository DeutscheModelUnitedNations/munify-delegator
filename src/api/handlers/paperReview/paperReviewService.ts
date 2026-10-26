import type { Context } from '#api/context.js';
import { type Transaction, db, schema } from '#api/db/db.js';
import { sendNewReviewNotification } from '#api/services/email/sendNewReviewNotification.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, count, eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { translatePaperStatus, translatePaperType } from '#lib/utils/enumTranslations.js';
import type { PaperstatusEnum } from '#lib/api/rumbleClient/client.js';
import { localeOfUser, runWithLocale } from '#api/services/requestLocale.js';
import { apiError } from '#api/services/errors/apiError.js';
import { splitRole } from '#lib/helpers/conferenceRole.js';

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

/** Whether a `count()` row, which a query over no rows may leave out, counted nothing. */
function isZeroCount(row: { value: number } | undefined) {
	return (row?.value ?? 0) === 0;
}

/** Nation delegations: one piece per agenda item, found when it has no review yet. */
async function isFirstNationPieceReview(
	tx: Transaction,
	paper: PaperForReview,
	agendaItemId: string
) {
	const [existing] = await tx
		.select({ value: count() })
		.from(schema.paperReview)
		.innerJoin(schema.paperVersion, eq(schema.paperReview.paperVersionId, schema.paperVersion.id))
		.innerJoin(schema.paper, eq(schema.paperVersion.paperId, schema.paper.id))
		.where(
			and(
				eq(schema.paper.delegationId, paper.delegationId),
				eq(schema.paper.agendaItemId, agendaItemId)
			)
		);
	return isZeroCount(existing);
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

	const [existing] = await tx
		.select({ value: count() })
		.from(schema.paperReview)
		.innerJoin(schema.paperVersion, eq(schema.paperReview.paperVersionId, schema.paperVersion.id))
		.where(eq(schema.paperVersion.paperId, paper.id));
	return isZeroCount(existing);
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

type Reviewer = Pick<
	ReturnType<Context['mustBeLoggedIn']>,
	'sub' | 'given_name' | 'family_name' | 'email'
>;

function notifyAuthor(
	paper: PaperForReview,
	reviewer: Reviewer,
	newStatus: PaperstatusEnum,
	origin: string
) {
	if (!paper.author) return;
	const locale = localeOfUser(paper.author.locale);
	sendNewReviewNotification({
		recipientEmail: paper.author.email,
		recipientName: `${paper.author.givenName} ${paper.author.familyName}`,
		locale,
		paperTitle:
			agendaItemLabel(paper) ?? runWithLocale(locale, () => translatePaperType(paper.type)),
		paperType: paper.type,
		reviewerName: `${reviewer.given_name} ${reviewer.family_name}`,
		reviewerEmail: reviewer.email,
		newStatus,
		conferenceTitle: paper.conference?.title ?? '',
		paperUrl: `${origin}/dashboard/${paper.delegation.conferenceId}/paperhub/${paper.id}`
	}).catch((error) => {
		console.error('Failed to send review notification email:', error);
	});
}

/**
 * Records a reviewer's verdict on a paper's latest version.
 *
 * Besides writing the review it advances the paper and version status, emails the author, and
 * works out whether this was the first review for a "piece" of the flag collection - the
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
	reviewer: Reviewer,
	origin: string
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
			.where(eq(schema.paper.id, args.paperId));
		await tx
			.update(schema.paperVersion)
			.set({ status: args.newStatus })
			.where(eq(schema.paperVersion.id, latestVersion.id));

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

	// Only once the review is committed: a rollback must not leave the author a mail about it.
	notifyAuthor(paper, reviewer, args.newStatus, origin);

	return result;
}
