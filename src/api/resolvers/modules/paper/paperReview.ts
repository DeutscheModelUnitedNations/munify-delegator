import {
	PaperReviewCommentsFieldObject,
	PaperReviewCreatedAtFieldObject,
	PaperReviewIdFieldObject,
	PaperReviewReviewerFieldObject,
	PaperReviewPaperVersionFieldObject,
	PaperReviewStatusBeforeFieldObject,
	PaperReviewStatusAfterFieldObject
} from '$db/generated/graphql/PaperReview';
import { builder } from '../../builder';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import { PaperStatus, Json } from '$db/generated/graphql/inputs';
import { sendNewReviewNotification } from '$api/services/email';

builder.prismaObject('PaperReview', {
	fields: (t) => ({
		id: t.field(PaperReviewIdFieldObject),
		comments: t.field(PaperReviewCommentsFieldObject),
		statusBefore: t.field(PaperReviewStatusBeforeFieldObject),
		statusAfter: t.field(PaperReviewStatusAfterFieldObject),
		paperVersion: t.relation('paperVersion', PaperReviewPaperVersionFieldObject),
		reviewer: t.relation('reviewer', PaperReviewReviewerFieldObject),
		createdAt: t.field(PaperReviewCreatedAtFieldObject)
	})
});

// Types for piece unlock data
interface UnlockedPieceData {
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
}

// GraphQL type for flag unlock information
const FlagTypeEnum = builder.enumType('FlagTypeForUnlock', {
	values: ['NATION', 'NSA'] as const
});

const UnlockedPieceDataRef = builder.objectRef<UnlockedPieceData>('UnlockedPieceData');

UnlockedPieceDataRef.implement({
	fields: (t) => ({
		flagId: t.exposeString('flagId'),
		flagName: t.exposeString('flagName'),
		flagType: t.field({ type: FlagTypeEnum, resolve: (p) => p.flagType }),
		flagAlpha2Code: t.exposeString('flagAlpha2Code', { nullable: true }),
		flagAlpha3Code: t.exposeString('flagAlpha3Code', { nullable: true }),
		fontAwesomeIcon: t.exposeString('fontAwesomeIcon', { nullable: true }),
		pieceName: t.exposeString('pieceName'),
		foundCount: t.exposeInt('foundCount'),
		totalCount: t.exposeInt('totalCount'),
		isComplete: t.exposeBoolean('isComplete')
	})
});

// New return type that includes review and piece unlock info
interface CreatePaperReviewResult {
	review: {
		id: string;
	};
	pieceUnlocked: boolean;
	unlockedPieceData: UnlockedPieceData | null;
}

const CreatePaperReviewResultRef =
	builder.objectRef<CreatePaperReviewResult>('CreatePaperReviewResult');

CreatePaperReviewResultRef.implement({
	fields: (t) => ({
		review: t.prismaField({
			type: 'PaperReview',
			resolve: async (query, parent) => {
				return db.paperReview.findUniqueOrThrow({
					...query,
					where: { id: parent.review.id }
				});
			}
		}),
		pieceUnlocked: t.exposeBoolean('pieceUnlocked'),
		unlockedPieceData: t.field({
			type: UnlockedPieceDataRef,
			nullable: true,
			resolve: (parent) => parent.unlockedPieceData
		})
	})
});

// Helper to get nation name (returns alpha3Code as fallback - client handles translation)
function getNationName(alpha3Code: string): string {
	return alpha3Code;
}

builder.mutationFields((t) => ({
	createPaperReview: t.field({
		type: CreatePaperReviewResultRef,
		args: {
			paperId: t.arg.string({ required: true }),
			comments: t.arg({ type: Json, required: true }),
			newStatus: t.arg({ type: PaperStatus, required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			return await db.$transaction(async (tx) => {
				// Get paper and verify permissions
				const paper = await tx.paper.findUniqueOrThrow({
					where: { id: args.paperId },
					include: {
						versions: {
							orderBy: { version: 'desc' },
							take: 1
						},
						author: {
							select: {
								email: true,
								given_name: true,
								family_name: true
							}
						},
						agendaItem: {
							select: {
								id: true,
								title: true,
								committee: {
									select: {
										abbreviation: true
									}
								}
							}
						},
						delegation: {
							select: {
								id: true,
								assignedNationAlpha3Code: true,
								assignedNonStateActorId: true,
								assignedNation: {
									select: {
										alpha2Code: true,
										alpha3Code: true
									}
								},
								assignedNonStateActor: {
									select: {
										id: true,
										name: true,
										abbreviation: true,
										fontAwesomeIcon: true
									}
								}
							}
						},
						conference: {
							include: {
								teamMembers: {
									where: {
										userId: user.sub,
										role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
									}
								}
							}
						}
					}
				});

				// Check if user is a team member with review permissions
				if (paper.conference.teamMembers.length === 0) {
					throw new GraphQLError('Only team members can create reviews');
				}

				// Validate status transition - reviews can set any reviewable status
				const currentStatus = paper.status;
				const reviewableStatuses = ['SUBMITTED', 'REVISED', 'CHANGES_REQUESTED', 'ACCEPTED'];
				const allowedNewStatuses = ['CHANGES_REQUESTED', 'ACCEPTED'];

				if (!reviewableStatuses.includes(currentStatus)) {
					throw new GraphQLError(`Cannot review a paper with status ${currentStatus}`);
				}

				if (!allowedNewStatuses.includes(args.newStatus)) {
					throw new GraphQLError(`Invalid review status: ${args.newStatus}`);
				}

				const latestVersion = paper.versions[0];
				if (!latestVersion) {
					throw new GraphQLError('Paper has no versions - cannot create review');
				}

				// Check if this is the first review for this delegation+agendaItem combo
				// This determines if we're "finding" a new puzzle piece
				let wasFirstReviewForPiece = false;

				if (paper.delegation.assignedNationAlpha3Code && paper.agendaItemId) {
					// For nations: check if any paper from this delegation for this agenda item has been reviewed
					const existingReviewCount = await tx.paperReview.count({
						where: {
							paperVersion: {
								paper: {
									delegationId: paper.delegationId,
									agendaItemId: paper.agendaItemId,
									conferenceId: paper.conferenceId
								}
							}
						}
					});
					wasFirstReviewForPiece = existingReviewCount === 0;
				} else if (paper.delegation.assignedNonStateActorId) {
					if (paper.type === 'INTRODUCTION_PAPER') {
						// For introduction papers: check if at least one review exists for any introduction paper
						const reviewedIntroPaperCount = await tx.paper.count({
							where: {
								delegationId: paper.delegationId,
								conferenceId: paper.conferenceId,
								type: 'INTRODUCTION_PAPER',
								status: { not: 'DRAFT' },
								versions: {
									some: {
										reviews: {
											some: {}
										}
									}
								}
							}
						});
						wasFirstReviewForPiece = reviewedIntroPaperCount === 0;
					} else {
						// For regular papers there are 2 pieces to unlock.
						const reviewedPaperCount = await tx.paper.count({
							where: {
								delegationId: paper.delegationId,
								conferenceId: paper.conferenceId,
								status: { not: 'DRAFT' },
								versions: {
									some: {
										reviews: {
											some: {}
										}
									}
								}
							}
						});
						if (reviewedPaperCount < 2) {
							// If there are fewer than 2 reviewed papers, ensure this paper hasn't been reviewed yet
							const existingReviewCount = await tx.paperReview.count({
								where: {
									paperVersion: {
										paper: {
											id: paper.id
										}
									}
								}
							});
							wasFirstReviewForPiece = existingReviewCount === 0;
						} else {
							wasFirstReviewForPiece = false;
						}
					}
				}

				// Create the review
				const review = await tx.paperReview.create({
					data: {
						comments: args.comments ?? {},
						paperVersionId: latestVersion.id,
						reviewerId: user.sub,
						statusBefore: currentStatus,
						statusAfter: args.newStatus
					}
				});

				// Update paper and version status
				await tx.paper.update({
					where: { id: args.paperId },
					data: { status: args.newStatus }
				});

				await tx.paperVersion.update({
					where: { id: latestVersion.id },
					data: { status: args.newStatus }
				});

				// Send email notification to the paper author (fire-and-forget, don't block the response)
				const paperTypeLabels: Record<string, string> = {
					POSITION_PAPER: 'Positionspapier',
					WORKING_PAPER: 'Arbeitspapier',
					INTRODUCTION_PAPER: 'Einführungspapier'
				};

				const statusLabels: Record<string, string> = {
					CHANGES_REQUESTED: 'Änderungen angefordert',
					ACCEPTED: 'Akzeptiert'
				};

				// Construct paper title from agenda item (similar to frontend display)
				const paperTitle = paper.agendaItem
					? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
					: (paperTypeLabels[paper.type] ?? paper.type);

				const baseUrl = ctx.url.origin;
				sendNewReviewNotification({
					recipientEmail: paper.author.email,
					recipientName: `${paper.author.given_name} ${paper.author.family_name}`,
					paperTitle,
					paperType: paperTypeLabels[paper.type] ?? paper.type,
					reviewerName: `${user.given_name} ${user.family_name}`,
					reviewerEmail: user.email,
					newStatus: statusLabels[args.newStatus] ?? args.newStatus,
					conferenceTitle: paper.conference.title,
					paperUrl: `${baseUrl}/dashboard/${paper.conferenceId}/paperhub/${paper.id}`
				}).catch((error) => {
					console.error('Failed to send review notification email:', error);
				});

				// Calculate piece unlock data if this was the first review
				let unlockedPieceData: UnlockedPieceData | null = null;

				if (wasFirstReviewForPiece) {
					if (paper.delegation.assignedNation) {
						// Nation flag
						const nation = paper.delegation.assignedNation;

						// Count total pieces (agenda items in committees where nation has seats)
						const committees = await tx.committee.findMany({
							where: {
								conferenceId: paper.conferenceId,
								nations: { some: { alpha3Code: nation.alpha3Code } }
							},
							include: {
								CommitteeAgendaItem: true
							}
						});
						const totalPieces = committees.reduce(
							(sum, c) => sum + c.CommitteeAgendaItem.length,
							0
						);

						// Count found pieces (reviewed papers for this delegation)
						const foundPieces = await tx.paper.count({
							where: {
								delegationId: paper.delegationId,
								conferenceId: paper.conferenceId,
								status: { not: 'DRAFT' },
								agendaItemId: { not: null },
								versions: {
									some: {
										reviews: { some: {} }
									}
								}
							}
						});

						unlockedPieceData = {
							flagId: nation.alpha3Code,
							flagName: getNationName(nation.alpha3Code),
							flagType: 'NATION',
							flagAlpha2Code: nation.alpha2Code,
							flagAlpha3Code: nation.alpha3Code,
							fontAwesomeIcon: null,
							pieceName: paper.agendaItem
								? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
								: 'Paper',
							foundCount: foundPieces,
							totalCount: totalPieces,
							isComplete: foundPieces >= totalPieces
						};
					} else if (paper.delegation.assignedNonStateActor) {
						// NSA flag
						const nsa = paper.delegation.assignedNonStateActor;
						const NSA_PIECE_COUNT = 3;

						// Count reviewed papers for this NSA
						const foundPieces = await tx.paper.count({
							where: {
								delegationId: paper.delegationId,
								conferenceId: paper.conferenceId,
								status: { not: 'DRAFT' },
								versions: {
									some: {
										reviews: { some: {} }
									}
								}
							}
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
									: paper.agendaItem
										? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
										: `Paper ${foundPieces}`,
							foundCount: Math.min(foundPieces, NSA_PIECE_COUNT),
							totalCount: NSA_PIECE_COUNT,
							isComplete: foundPieces >= NSA_PIECE_COUNT
						};
					}
				}

				return {
					review: { id: review.id },
					pieceUnlocked: wasFirstReviewForPiece && unlockedPieceData !== null,
					unlockedPieceData
				};
			});
		}
	})
}));
