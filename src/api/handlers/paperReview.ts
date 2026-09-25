import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import { type TeamRole, systemAdmin, userId } from '$api/services/authHelper';
import { sendNewReviewNotification } from '$api/services/email';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { and, count, eq, isNotNull, ne } from 'drizzle-orm';

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

export const PaperReviewRef = object({ table: 'paperReview' });
query({ table: 'paperReview' });

const paperStatusEnum = enum_({ tsName: 'paperStatus' });

const UnlockedPieceData = schemaBuilder.simpleObject('UnlockedPieceData', {
	fields: (t) => ({
		flagId: t.string(),
		flagName: t.string(),
		flagType: t.string(),
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

			return db.transaction(async (tx) => {
				const paper = await tx.query.paper
					.findFirst({
						where: { id: args.paperId },
						with: {
							versions: { orderBy: { version: 'desc' }, limit: 1 },
							author: true,
							agendaItem: { with: { committee: true } },
							delegation: { with: { assignedNation: true, assignedNonStateActor: true } },
							conference: true
						}
					})
					.then(assertFindFirstExists);

				// Reviewing is a team-member action; the read ability alone is not enough.
				const teamMember = await tx.query.teamMember.findFirst({
					where: {
						conferenceId: paper.conferenceId,
						userId: reviewer.sub,
						role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
					}
				});
				if (!teamMember) {
					throw new GraphQLError('Only team members can create reviews');
				}

				if (!REVIEWABLE_STATUSES.includes(paper.status)) {
					throw new GraphQLError(`Cannot review a paper with status ${paper.status}`);
				}
				if (!ALLOWED_NEW_STATUSES.includes(args.newStatus)) {
					throw new GraphQLError(`Invalid review status: ${args.newStatus}`);
				}

				const latestVersion = paper.versions[0];
				if (!latestVersion) {
					throw new GraphQLError('Paper has no versions - cannot create review');
				}

				const delegation = paper.delegation;
				let wasFirstReviewForPiece = false;

				if (delegation?.assignedNationAlpha3Code && paper.agendaItemId) {
					// Nation delegations: one piece per agenda item.
					const [existing] = await tx
						.select({ value: count() })
						.from(schema.paperReview)
						.innerJoin(
							schema.paperVersion,
							eq(schema.paperReview.paperVersionId, schema.paperVersion.id)
						)
						.innerJoin(schema.paper, eq(schema.paperVersion.paperId, schema.paper.id))
						.where(
							and(
								eq(schema.paper.delegationId, paper.delegationId),
								eq(schema.paper.agendaItemId, paper.agendaItemId),
								eq(schema.paper.conferenceId, paper.conferenceId)
							)
						);
					wasFirstReviewForPiece = (existing?.value ?? 0) === 0;
				} else if (delegation?.assignedNonStateActorId) {
					if (paper.type === 'INTRODUCTION_PAPER') {
						const reviewed = await tx.query.paper.findMany({
							where: {
								...reviewedPaperWhere(paper.delegationId, paper.conferenceId),
								type: 'INTRODUCTION_PAPER'
							},
							columns: { id: true }
						});
						wasFirstReviewForPiece = reviewed.length === 0;
					} else {
						const reviewed = await tx.query.paper.findMany({
							where: {
								...reviewedPaperWhere(paper.delegationId, paper.conferenceId),
								type: { ne: 'INTRODUCTION_PAPER' }
							},
							columns: { id: true }
						});
						if (reviewed.length < 2) {
							const [existing] = await tx
								.select({ value: count() })
								.from(schema.paperReview)
								.innerJoin(
									schema.paperVersion,
									eq(schema.paperReview.paperVersionId, schema.paperVersion.id)
								)
								.where(eq(schema.paperVersion.paperId, paper.id));
							wasFirstReviewForPiece = (existing?.value ?? 0) === 0;
						}
					}
				}

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

				const paperTitle = paper.agendaItem?.committee
					? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
					: (PAPER_TYPE_LABELS[paper.type] ?? paper.type);

				if (paper.author) {
					sendNewReviewNotification({
						recipientEmail: paper.author.email,
						recipientName: `${paper.author.givenName} ${paper.author.familyName}`,
						paperTitle,
						paperType: PAPER_TYPE_LABELS[paper.type] ?? paper.type,
						reviewerName: `${reviewer.given_name} ${reviewer.family_name}`,
						reviewerEmail: reviewer.email,
						newStatus: STATUS_LABELS[args.newStatus] ?? args.newStatus,
						conferenceTitle: paper.conference?.title ?? '',
						paperUrl: `${ctx.url.origin}/dashboard/${paper.conferenceId}/paperhub/${paper.id}`
					}).catch((error) => {
						console.error('Failed to send review notification email:', error);
					});
				}

				let unlockedPieceData: typeof UnlockedPieceData.$inferType | null = null;

				if (wasFirstReviewForPiece && delegation?.assignedNation) {
					const nation = delegation.assignedNation;
					const committees = await tx.query.committee.findMany({
						where: { conferenceId: paper.conferenceId, nations: { alpha3Code: nation.alpha3Code } },
						with: { CommitteeAgendaItem: { columns: { id: true } } }
					});
					const totalPieces = committees.reduce(
						(sum, committee) => sum + committee.CommitteeAgendaItem.length,
						0
					);
					const found = await tx.query.paper.findMany({
						where: {
							...reviewedPaperWhere(paper.delegationId, paper.conferenceId),
							agendaItemId: { isNotNull: true }
						},
						columns: { id: true }
					});
					unlockedPieceData = {
						flagId: nation.alpha3Code,
						// The client translates the code into a display name.
						flagName: nation.alpha3Code,
						flagType: 'NATION',
						flagAlpha2Code: nation.alpha2Code,
						flagAlpha3Code: nation.alpha3Code,
						fontAwesomeIcon: null,
						pieceName: paper.agendaItem?.committee
							? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
							: 'Paper',
						foundCount: found.length,
						totalCount: totalPieces,
						isComplete: found.length >= totalPieces
					};
				} else if (wasFirstReviewForPiece && delegation?.assignedNonStateActor) {
					const nsa = delegation.assignedNonStateActor;
					const NSA_PIECE_COUNT = 3;
					const found = await tx.query.paper.findMany({
						where: reviewedPaperWhere(paper.delegationId, paper.conferenceId),
						columns: { id: true }
					});
					unlockedPieceData = {
						flagId: nsa.id,
						flagName: nsa.name,
						flagType: 'NSA',
						flagAlpha2Code: null,
						flagAlpha3Code: null,
						fontAwesomeIcon: nsa.fontAwesomeIcon,
						pieceName:
							paper.type === 'INTRODUCTION_PAPER'
								? 'Introduction Paper'
								: paper.agendaItem?.committee
									? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
									: `Paper ${found.length}`,
						foundCount: Math.min(found.length, NSA_PIECE_COUNT),
						totalCount: NSA_PIECE_COUNT,
						isComplete: found.length >= NSA_PIECE_COUNT
					};
				}

				return {
					reviewId: review.id,
					pieceUnlocked: wasFirstReviewForPiece && unlockedPieceData !== null,
					unlockedPieceData
				};
			});
		}
	})
}));
