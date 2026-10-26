import { schemaBuilder } from '#api/rumble.js';
import { assertCanReviewPapers } from '#api/handlers/paper/paperPermissions.js';
import type {
	FlagCollectionData,
	FlagCollectionStats,
	FlagPiece,
	FlagProgress
} from './flagCollectionService';
import { buildFlagCollection } from './flagCollectionService';

/**
 * Gamified view of a conference's paper progress: every nation and non-state actor is a "flag"
 * made of pieces, one per expected paper. A piece unlocks when the paper is submitted and is
 * found once it has been reviewed.
 */

const FlagPieceState = schemaBuilder.enumType('FlagPieceState', {
	values: ['LOCKED', 'UNLOCKED', 'FOUND'] as const
});

const FlagType = schemaBuilder.enumType('FlagType', {
	values: ['NATION', 'NSA'] as const
});

const FlagPieceRef = schemaBuilder.objectRef<FlagPiece>('FlagPiece').implement({
	fields: (t) => ({
		id: t.exposeString('id'),
		agendaItemId: t.exposeString('agendaItemId', { nullable: true }),
		agendaItemTitle: t.exposeString('agendaItemTitle', { nullable: true }),
		committeeAbbreviation: t.exposeString('committeeAbbreviation', { nullable: true }),
		state: t.field({ type: FlagPieceState, resolve: (parent) => parent.state })
	})
});

const FlagProgressRef = schemaBuilder.objectRef<FlagProgress>('FlagProgress').implement({
	fields: (t) => ({
		id: t.exposeString('id'),
		type: t.field({ type: FlagType, resolve: (parent) => parent.type }),
		alpha2Code: t.exposeString('alpha2Code', { nullable: true }),
		alpha3Code: t.exposeString('alpha3Code', { nullable: true }),
		name: t.exposeString('name'),
		abbreviation: t.exposeString('abbreviation', { nullable: true }),
		fontAwesomeIcon: t.exposeString('fontAwesomeIcon', { nullable: true }),
		totalPieces: t.exposeInt('totalPieces'),
		foundPieces: t.exposeInt('foundPieces'),
		unlockedPieces: t.exposeInt('unlockedPieces'),
		pieces: t.field({ type: [FlagPieceRef], resolve: (parent) => parent.pieces }),
		isComplete: t.exposeBoolean('isComplete')
	})
});

const FlagCollectionStatsRef = schemaBuilder
	.objectRef<FlagCollectionStats>('FlagCollectionStats')
	.implement({
		fields: (t) => ({
			totalFlags: t.exposeInt('totalFlags'),
			completedFlags: t.exposeInt('completedFlags'),
			totalPieces: t.exposeInt('totalPieces'),
			foundPieces: t.exposeInt('foundPieces'),
			unlockedPieces: t.exposeInt('unlockedPieces')
		})
	});

const FlagCollectionDataRef = schemaBuilder
	.objectRef<FlagCollectionData>('FlagCollectionData')
	.implement({
		fields: (t) => ({
			flags: t.field({ type: [FlagProgressRef], resolve: (parent) => parent.flags }),
			stats: t.field({ type: FlagCollectionStatsRef, resolve: (parent) => parent.stats })
		})
	});

schemaBuilder.queryFields((t) => ({
	flagCollection: t.field({
		type: FlagCollectionDataRef,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReviewPapers(ctx, args.conferenceId);

			return buildFlagCollection(args.conferenceId);
		}
	})
}));
