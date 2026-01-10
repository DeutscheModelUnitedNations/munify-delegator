import { builder } from '../builder';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';

// Define the piece state enum
const FlagPieceState = builder.enumType('FlagPieceState', {
	values: ['LOCKED', 'UNLOCKED', 'FOUND'] as const
});

// Define the flag type enum
const FlagType = builder.enumType('FlagType', {
	values: ['NATION', 'NSA'] as const
});

// Type definitions for internal use
type PieceState = 'LOCKED' | 'UNLOCKED' | 'FOUND';

interface FlagPiece {
	id: string;
	agendaItemId: string | null;
	agendaItemTitle: string | null;
	committeeAbbreviation: string | null;
	state: PieceState;
}

interface FlagProgress {
	id: string;
	type: 'NATION' | 'NSA';
	alpha2Code: string | null;
	alpha3Code: string | null;
	name: string;
	abbreviation: string | null;
	fontAwesomeIcon: string | null;
	totalPieces: number;
	foundPieces: number;
	unlockedPieces: number;
	pieces: FlagPiece[];
	isComplete: boolean;
}

interface FlagCollectionStats {
	totalFlags: number;
	completedFlags: number;
	totalPieces: number;
	foundPieces: number;
	unlockedPieces: number;
}

interface FlagCollectionData {
	flags: FlagProgress[];
	stats: FlagCollectionStats;
}

// Define FlagPiece GraphQL type
const FlagPieceRef = builder.objectRef<FlagPiece>('FlagPiece');

FlagPieceRef.implement({
	fields: (t) => ({
		id: t.exposeString('id'),
		agendaItemId: t.exposeString('agendaItemId', { nullable: true }),
		agendaItemTitle: t.exposeString('agendaItemTitle', { nullable: true }),
		committeeAbbreviation: t.exposeString('committeeAbbreviation', { nullable: true }),
		state: t.field({
			type: FlagPieceState,
			resolve: (parent) => parent.state
		})
	})
});

// Define FlagProgress GraphQL type
const FlagProgressRef = builder.objectRef<FlagProgress>('FlagProgress');

FlagProgressRef.implement({
	fields: (t) => ({
		id: t.exposeString('id'),
		type: t.field({ type: FlagType, resolve: (p) => p.type }),
		alpha2Code: t.exposeString('alpha2Code', { nullable: true }),
		alpha3Code: t.exposeString('alpha3Code', { nullable: true }),
		name: t.exposeString('name'),
		abbreviation: t.exposeString('abbreviation', { nullable: true }),
		fontAwesomeIcon: t.exposeString('fontAwesomeIcon', { nullable: true }),
		totalPieces: t.exposeInt('totalPieces'),
		foundPieces: t.exposeInt('foundPieces'),
		unlockedPieces: t.exposeInt('unlockedPieces'),
		pieces: t.field({ type: [FlagPieceRef], resolve: (p) => p.pieces }),
		isComplete: t.exposeBoolean('isComplete')
	})
});

// Define FlagCollectionStats GraphQL type
const FlagCollectionStatsRef = builder.objectRef<FlagCollectionStats>('FlagCollectionStats');

FlagCollectionStatsRef.implement({
	fields: (t) => ({
		totalFlags: t.exposeInt('totalFlags'),
		completedFlags: t.exposeInt('completedFlags'),
		totalPieces: t.exposeInt('totalPieces'),
		foundPieces: t.exposeInt('foundPieces'),
		unlockedPieces: t.exposeInt('unlockedPieces')
	})
});

// Define FlagCollectionData GraphQL type
const FlagCollectionDataRef = builder.objectRef<FlagCollectionData>('FlagCollectionData');

FlagCollectionDataRef.implement({
	fields: (t) => ({
		flags: t.field({ type: [FlagProgressRef], resolve: (p) => p.flags }),
		stats: t.field({ type: FlagCollectionStatsRef, resolve: (p) => p.stats })
	})
});

// Helper to get localized nation name
function getNationName(alpha3Code: string): string {
	// Use convert-iso-codes or similar for proper localization
	// For now, return the alpha3Code as a fallback
	try {
		const { Alpha3 } = require('convert-iso-codes');
		return Alpha3.toName(alpha3Code) ?? alpha3Code;
	} catch {
		return alpha3Code;
	}
}

// Query implementation
builder.queryFields((t) => ({
	flagCollection: t.field({
		type: FlagCollectionDataRef,
		args: {
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Verify user is a team member with review permissions
			const teamMember = await db.teamMember.findFirst({
				where: {
					conferenceId: args.conferenceId,
					userId: user.sub,
					role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
				}
			});

			if (!teamMember) {
				throw new GraphQLError(
					'Access denied - requires team member status with review permissions'
				);
			}

			// 1. Fetch all committees with their nations and agenda items
			const committees = await db.committee.findMany({
				where: { conferenceId: args.conferenceId },
				include: {
					nations: true,
					CommitteeAgendaItem: true
				}
			});

			// 2. Fetch all NSAs for the conference
			const nsas = await db.nonStateActor.findMany({
				where: { conferenceId: args.conferenceId }
			});

			// 3. Fetch all delegations with their assignments
			const delegations = await db.delegation.findMany({
				where: { conferenceId: args.conferenceId },
				select: {
					id: true,
					assignedNationAlpha3Code: true,
					assignedNonStateActorId: true
				}
			});

			// 4. Build delegation lookup maps
			const nationDelegationMap = new Map<string, string[]>(); // nationAlpha3 -> delegationIds
			const nsaDelegationMap = new Map<string, string[]>(); // nsaId -> delegationIds

			for (const delegation of delegations) {
				if (delegation.assignedNationAlpha3Code) {
					const existing = nationDelegationMap.get(delegation.assignedNationAlpha3Code) ?? [];
					existing.push(delegation.id);
					nationDelegationMap.set(delegation.assignedNationAlpha3Code, existing);
				} else if (delegation.assignedNonStateActorId) {
					const existing = nsaDelegationMap.get(delegation.assignedNonStateActorId) ?? [];
					existing.push(delegation.id);
					nsaDelegationMap.set(delegation.assignedNonStateActorId, existing);
				}
			}

			// 5. Fetch all non-DRAFT papers with review counts
			const papers = await db.paper.findMany({
				where: {
					conferenceId: args.conferenceId,
					status: { not: 'DRAFT' }
				},
				select: {
					id: true,
					delegationId: true,
					agendaItemId: true,
					type: true,
					versions: {
						select: {
							id: true,
							reviews: {
								select: { id: true },
								take: 1 // Just need to know if any review exists
							}
						}
					}
				}
			});

			// 6. Build paper state maps
			// For nations: Map<"nationAlpha3:agendaItemId", { hasPaper: boolean, hasReview: boolean }>
			// For NSAs: Map<"nsaId", { papers: Paper[], reviewedCount: number }>

			type PieceInfo = { hasPaper: boolean; hasReview: boolean };
			const nationPieceStates = new Map<string, PieceInfo>();
			const nsaPaperInfo = new Map<string, { totalPapers: number; reviewedPapers: number }>();

			for (const paper of papers) {
				const hasReview = paper.versions.some((v) => v.reviews.length > 0);

				// Check if this paper belongs to a nation delegation
				const nationAlpha3 = delegations.find(
					(d) => d.id === paper.delegationId
				)?.assignedNationAlpha3Code;
				const nsaId = delegations.find((d) => d.id === paper.delegationId)?.assignedNonStateActorId;

				if (nationAlpha3 && paper.agendaItemId) {
					const key = `${nationAlpha3}:${paper.agendaItemId}`;
					const existing = nationPieceStates.get(key) ?? { hasPaper: false, hasReview: false };
					existing.hasPaper = true;
					existing.hasReview = existing.hasReview || hasReview;
					nationPieceStates.set(key, existing);
				} else if (nsaId) {
					const existing = nsaPaperInfo.get(nsaId) ?? { totalPapers: 0, reviewedPapers: 0 };
					existing.totalPapers++;
					if (hasReview) existing.reviewedPapers++;
					nsaPaperInfo.set(nsaId, existing);
				}
			}

			// 7. Build nation flags
			// For each nation that has committee assignments:
			const nationFlags: FlagProgress[] = [];

			// Build a map of nation -> agenda items
			const nationAgendaItems = new Map<
				string,
				Array<{ agendaItemId: string; agendaItemTitle: string; committeeAbbreviation: string }>
			>();

			for (const committee of committees) {
				for (const nation of committee.nations) {
					const existing = nationAgendaItems.get(nation.alpha3Code) ?? [];
					for (const agendaItem of committee.CommitteeAgendaItem) {
						existing.push({
							agendaItemId: agendaItem.id,
							agendaItemTitle: agendaItem.title,
							committeeAbbreviation: committee.abbreviation
						});
					}
					nationAgendaItems.set(nation.alpha3Code, existing);
				}
			}

			// Create flag progress for each nation with agenda items
			for (const [alpha3Code, agendaItems] of nationAgendaItems.entries()) {
				if (agendaItems.length === 0) continue;

				const nation = committees
					.flatMap((c) => c.nations)
					.find((n) => n.alpha3Code === alpha3Code);
				if (!nation) continue;

				const pieces: FlagPiece[] = agendaItems.map((ai) => {
					const key = `${alpha3Code}:${ai.agendaItemId}`;
					const info = nationPieceStates.get(key);
					let state: PieceState = 'LOCKED';
					if (info?.hasReview) {
						state = 'FOUND';
					} else if (info?.hasPaper) {
						state = 'UNLOCKED';
					}

					return {
						id: key,
						agendaItemId: ai.agendaItemId,
						agendaItemTitle: ai.agendaItemTitle,
						committeeAbbreviation: ai.committeeAbbreviation,
						state
					};
				});

				const foundPieces = pieces.filter((p) => p.state === 'FOUND').length;
				const unlockedPieces = pieces.filter((p) => p.state === 'UNLOCKED').length;

				nationFlags.push({
					id: alpha3Code,
					type: 'NATION',
					alpha2Code: nation.alpha2Code,
					alpha3Code: nation.alpha3Code,
					name: getNationName(alpha3Code),
					abbreviation: null,
					fontAwesomeIcon: null,
					totalPieces: pieces.length,
					foundPieces,
					unlockedPieces,
					pieces,
					isComplete: foundPieces === pieces.length
				});
			}

			// 8. Build NSA flags (fixed 3 pieces each)
			const nsaFlags: FlagProgress[] = [];
			const NSA_PIECE_COUNT = 3;

			for (const nsa of nsas) {
				const info = nsaPaperInfo.get(nsa.id) ?? { totalPapers: 0, reviewedPapers: 0 };

				// NSAs have 3 fixed pieces
				// Pieces are "unlocked" by paper submissions and "found" by reviews
				const pieces: FlagPiece[] = [];

				for (let i = 0; i < NSA_PIECE_COUNT; i++) {
					let state: PieceState = 'LOCKED';

					// Piece is unlocked if we have at least (i+1) papers
					// Piece is found if we have at least (i+1) reviewed papers
					if (info.reviewedPapers > i) {
						state = 'FOUND';
					} else if (info.totalPapers > i) {
						state = 'UNLOCKED';
					}

					pieces.push({
						id: `nsa:${nsa.id}:${i}`,
						agendaItemId: null,
						agendaItemTitle: i === 0 ? 'Introduction Paper' : `Paper ${i + 1}`,
						committeeAbbreviation: null,
						state
					});
				}

				const foundPieces = pieces.filter((p) => p.state === 'FOUND').length;
				const unlockedPieces = pieces.filter((p) => p.state === 'UNLOCKED').length;

				nsaFlags.push({
					id: nsa.id,
					type: 'NSA',
					alpha2Code: null,
					alpha3Code: null,
					name: nsa.name,
					abbreviation: nsa.abbreviation,
					fontAwesomeIcon: nsa.fontAwesomeIcon,
					totalPieces: NSA_PIECE_COUNT,
					foundPieces,
					unlockedPieces,
					pieces,
					isComplete: foundPieces === NSA_PIECE_COUNT
				});
			}

			// 9. Combine and calculate stats
			const allFlags = [...nationFlags, ...nsaFlags];

			// Sort by progress (most progress first), then by name
			allFlags.sort((a, b) => {
				const aProgress = a.foundPieces / a.totalPieces;
				const bProgress = b.foundPieces / b.totalPieces;
				if (bProgress !== aProgress) return bProgress - aProgress;
				return a.name.localeCompare(b.name);
			});

			const stats: FlagCollectionStats = {
				totalFlags: allFlags.length,
				completedFlags: allFlags.filter((f) => f.isComplete).length,
				totalPieces: allFlags.reduce((sum, f) => sum + f.totalPieces, 0),
				foundPieces: allFlags.reduce((sum, f) => sum + f.foundPieces, 0),
				unlockedPieces: allFlags.reduce((sum, f) => sum + f.unlockedPieces, 0)
			};

			return { flags: allFlags, stats };
		}
	})
}));
