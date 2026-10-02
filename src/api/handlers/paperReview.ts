import { type Transaction, db, schema } from '$api/db/db';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import { type TeamRole, systemAdmin, userId } from '$api/services/authHelper';
import type { Context } from '$api/context';
import { sendNewReviewNotification } from '$api/services/email';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { and, count, eq } from 'drizzle-orm';

const PAPER_ROLES = [
	'REVIEWER',
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

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
const pubsub = rumblePubsub({ table: 'paperReview' });
// A review moves the paper's status and stamps the version it reviewed.
const paperPubsub = rumblePubsub({ table: 'paper' });
const paperVersionPubsub = rumblePubsub({ table: 'paperVersion' });

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

const PAPER_TYPE_LABELS: Record<string, string> = {
	POSITION_PAPER: 'Positionspapier',
	WORKING_PAPER: 'Arbeitspapier',
	INTRODUCTION_PAPER: 'Einführungspapier'
};

const STATUS_LABELS: Record<string, string> = {
	CHANGES_REQUESTED: 'Änderungen angefordert',
	ACCEPTED: 'Akzeptiert'
};

const REVIEWABLE_STATUSES = ['SUBMITTED', 'REVISED', 'CHANGES_REQUESTED', 'ACCEPTED'];
const ALLOWED_NEW_STATUSES = ['CHANGES_REQUESTED', 'ACCEPTED'];

/** Papers that are past draft and already carry at least one review. */
const reviewedPaperWhere = (delegationId: string, conferenceId: string) => ({
	delegationId,
	conferenceId,
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
				delegation: { with: { assignedNation: true, assignedNonStateActor: true } },
				conference: true
			}
		})
		.then(assertFindFirstExists);
}

type PaperForReview = Awaited<ReturnType<typeof fetchPaperForReview>>;

/** Rejects the review unless the reviewer may review, and the paper and verdict allow it. */
async function assertMayReview(
	tx: Transaction,
	paper: PaperForReview,
	reviewerId: string,
	newStatus: string
) {
	// Reviewing is a team-member action; the read ability alone is not enough.
	const teamMember = await tx.query.teamMember.findFirst({
		where: {
			conferenceId: paper.conferenceId,
			userId: reviewerId,
			role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
		}
	});
	if (!teamMember) {
		throw new GraphQLError('Only team members can create reviews');
	}

	if (!REVIEWABLE_STATUSES.includes(paper.status)) {
		throw new GraphQLError(`Cannot review a paper with status ${paper.status}`);
	}
	if (!ALLOWED_NEW_STATUSES.includes(newStatus)) {
		throw new GraphQLError(`Invalid review status: ${newStatus}`);
	}

	const latestVersion = paper.versions[0];
	if (!latestVersion) {
		throw new GraphQLError('Paper has no versions - cannot create review');
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
				eq(schema.paper.agendaItemId, agendaItemId),
				eq(schema.paper.conferenceId, paper.conferenceId)
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
			...reviewedPaperWhere(paper.delegationId, paper.conferenceId),
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
	const delegation = paper.delegation;
	if (delegation?.assignedNationAlpha3Code && paper.agendaItemId) {
		return isFirstNationPieceReview(tx, paper, paper.agendaItemId);
	}
	if (delegation?.assignedNonStateActorId) {
		return isFirstNsaPieceReview(tx, paper);
	}
	return false;
}

type UnlockedPiece = typeof UnlockedPieceData.$inferType;

async function nationPiece(
	tx: Transaction,
	paper: PaperForReview,
	nation: { alpha2Code: string; alpha3Code: string }
): Promise<UnlockedPiece> {
	const committees = await tx.query.committee.findMany({
		where: { conferenceId: paper.conferenceId, nations: { alpha3Code: nation.alpha3Code } },
		with: { agendaItems: { columns: { id: true } } }
	});
	const totalPieces = committees.reduce((sum, committee) => sum + committee.agendaItems.length, 0);
	const found = await tx.query.paper.findMany({
		where: {
			...reviewedPaperWhere(paper.delegationId, paper.conferenceId),
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
		pieceName: agendaItemLabel(paper) ?? 'Paper',
		foundCount: found.length,
		totalCount: totalPieces,
		isComplete: found.length >= totalPieces
	};
}

const NSA_PIECE_COUNT = 3;

async function nsaPiece(
	tx: Transaction,
	paper: PaperForReview,
	nsa: { id: string; name: string; fontAwesomeIcon: string | null }
): Promise<UnlockedPiece> {
	const found = await tx.query.paper.findMany({
		where: reviewedPaperWhere(paper.delegationId, paper.conferenceId),
		columns: { id: true }
	});
	return {
		flagId: nsa.id,
		flagName: nsa.name,
		flagType: 'NSA',
		flagAlpha2Code: null,
		flagAlpha3Code: null,
		fontAwesomeIcon: nsa.fontAwesomeIcon,
		pieceName:
			paper.type === 'INTRODUCTION_PAPER'
				? 'Introduction Paper'
				: (agendaItemLabel(paper) ?? `Paper ${found.length}`),
		foundCount: Math.min(found.length, NSA_PIECE_COUNT),
		totalCount: NSA_PIECE_COUNT,
		isComplete: found.length >= NSA_PIECE_COUNT
	};
}

/** The flag piece a first review just uncovered, counted after the review was written. */
async function unlockedPiece(tx: Transaction, paper: PaperForReview) {
	const delegation = paper.delegation;
	if (!delegation) return null;
	if (delegation.assignedNation) return nationPiece(tx, paper, delegation.assignedNation);
	if (delegation.assignedNonStateActor) {
		return nsaPiece(tx, paper, delegation.assignedNonStateActor);
	}
	return null;
}

function notifyAuthor(
	paper: PaperForReview,
	reviewer: Pick<ReturnType<Context['mustBeLoggedIn']>, 'given_name' | 'family_name' | 'email'>,
	newStatus: string,
	origin: string
) {
	if (!paper.author) return;
	const paperType = PAPER_TYPE_LABELS[paper.type] ?? paper.type;
	sendNewReviewNotification({
		recipientEmail: paper.author.email,
		recipientName: `${paper.author.givenName} ${paper.author.familyName}`,
		paperTitle: agendaItemLabel(paper) ?? paperType,
		paperType,
		reviewerName: `${reviewer.given_name} ${reviewer.family_name}`,
		reviewerEmail: reviewer.email,
		newStatus: STATUS_LABELS[newStatus] ?? newStatus,
		conferenceTitle: paper.conference?.title ?? '',
		paperUrl: `${origin}/dashboard/${paper.conferenceId}/paperhub/${paper.id}`
	}).catch((error) => {
		console.error('Failed to send review notification email:', error);
	});
}

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
			const reviewer = ctx.mustBeLoggedIn();

			pubsub.created();
			paperPubsub.updated(args.paperId);
			paperVersionPubsub.updated();

			return db.transaction(async (tx) => {
				const paper = await fetchPaperForReview(tx, args.paperId);
				const latestVersion = await assertMayReview(tx, paper, reviewer.sub, args.newStatus);
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

				notifyAuthor(paper, reviewer, args.newStatus, ctx.url.origin);

				const unlockedPieceData = wasFirstReviewForPiece ? await unlockedPiece(tx, paper) : null;

				return {
					reviewId: review.id,
					pieceUnlocked: wasFirstReviewForPiece && unlockedPieceData !== null,
					unlockedPieceData
				};
			});
		}
	})
}));
