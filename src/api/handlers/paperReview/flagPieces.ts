/**
 * The flag collection's pieces, the gamified progress display of the reviewer hub: whether a review
 * uncovers a new piece of a delegation's flag, and what that piece is. A nation delegation counts
 * one piece per agenda item; a non-state actor's introduction paper is its own piece, and its
 * other papers count up to two more.
 */
import type { Transaction } from '#api/db/db';
import type * as schema from '#api/db/schema/index';
import { m } from '#lib/paraglide/messages';
import { splitRole, type ConferenceRoleKind } from '#lib/helpers/conferenceRole';

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

/** What the pieces are worked out from: the reviewed paper with its agenda item and role. */
export type FlagPaper = {
	id: string;
	delegationId: string;
	type: (typeof schema.paper.$inferSelect)['type'];
	agendaItemId: string | null;
	agendaItem: { title: string; committee: { abbreviation: string } | null } | null;
	delegation: {
		conferenceId: string;
		assignedRole: {
			id: string;
			kind: ConferenceRoleKind;
			name: string | null;
			fontAwesomeIcon: string | null;
			nation: { alpha2Code: string; alpha3Code: string } | null;
		} | null;
	};
};

/** Papers that are past draft and already carry at least one review. */
const reviewedPaperWhere = (delegationId: string) => ({
	delegationId,
	status: { ne: 'DRAFT' as const },
	versions: { reviews: {} }
});

/** The committee and agenda item a paper belongs to, if it belongs to one. */
function agendaItemLabel(paper: FlagPaper) {
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
	paper: FlagPaper;
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
async function isFirstNsaPieceReview({ tx, paper }: { tx: Transaction; paper: FlagPaper }) {
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

/** Whether a review of the paper, asked before it is written, finds a new piece of the flag. */
export function isFirstReviewForPiece({ tx, paper }: { tx: Transaction; paper: FlagPaper }) {
	const kind = paper.delegation.assignedRole?.kind;
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
	paper: FlagPaper;
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
	paper: FlagPaper;
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
export async function unlockedPiece({ tx, paper }: { tx: Transaction; paper: FlagPaper }) {
	const role = paper.delegation.assignedRole;
	const { nation, nonStateActor } = splitRole(role);
	if (role && nation) return nationPiece({ tx, paper, roleId: role.id, nation });
	if (nonStateActor) return nsaPiece({ tx, paper, nsa: nonStateActor });
	return null;
}
