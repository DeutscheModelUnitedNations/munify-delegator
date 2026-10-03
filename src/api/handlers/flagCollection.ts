import { db } from '$api/db/db';
import { schemaBuilder } from '$api/rumble';
import { assertPaperReviewer } from './paper';

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

/** The client translates alpha3 codes, so the raw code doubles as the name here. */
function getNationName(alpha3Code: string): string {
	return alpha3Code;
}

const NSA_PIECE_COUNT = 3;

function pieceState(found: boolean, unlocked: boolean): PieceState {
	if (found) return 'FOUND';
	if (unlocked) return 'UNLOCKED';
	return 'LOCKED';
}

/** A flag's progress counters, derived from its pieces. */
function progressOf(pieces: FlagPiece[]) {
	return {
		foundPieces: pieces.filter((piece) => piece.state === 'FOUND').length,
		unlockedPieces: pieces.filter((piece) => piece.state === 'UNLOCKED').length
	};
}

async function fetchFlagSources(conferenceId: string) {
	const [committees, nsas, delegations, papers] = await Promise.all([
		db.query.committee.findMany({
			where: { conferenceId },
			with: { nations: true, agendaItems: true }
		}),
		db.query.nonStateActor.findMany({ where: { conferenceId } }),
		db.query.delegation.findMany({
			where: { conferenceId },
			columns: { id: true, assignedNationAlpha3Code: true, assignedNonStateActorId: true }
		}),
		db.query.paper.findMany({
			where: { conferenceId, status: { ne: 'DRAFT' } },
			columns: { id: true, delegationId: true, agendaItemId: true },
			with: {
				versions: {
					columns: { id: true },
					// Only whether a review exists matters, not how many.
					with: { reviews: { columns: { id: true }, limit: 1 } }
				}
			}
		})
	]);
	return { committees, nsas, delegations, papers };
}

type FlagSources = Awaited<ReturnType<typeof fetchFlagSources>>;
type PieceInfo = { hasPaper: boolean; hasReview: boolean };
type NsaPaperInfo = { totalPapers: number; reviewedPapers: number };

/**
 * Which pieces the submitted papers account for: per nation and agenda item whether there is a
 * paper and a review, and per non-state actor how many papers there are and how many were reviewed.
 */
function tallyPapers({ papers, delegations }: FlagSources) {
	const delegationsById = new Map(delegations.map((delegation) => [delegation.id, delegation]));
	const nationPieceStates = new Map<string, PieceInfo>();
	const nsaPaperInfo = new Map<string, NsaPaperInfo>();

	for (const paper of papers) {
		const hasReview = paper.versions.some((version) => version.reviews.length > 0);
		const delegation = delegationsById.get(paper.delegationId);
		const nationAlpha3 = delegation?.assignedNationAlpha3Code;
		const nsaId = delegation?.assignedNonStateActorId;

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
	return { nationPieceStates, nsaPaperInfo };
}

type NationAgendaItem = {
	agendaItemId: string;
	agendaItemTitle: string;
	committeeAbbreviation: string;
};

/** A nation gets one piece per agenda item of every committee it sits in. */
function nationAgendaItemsOf(committees: FlagSources['committees']) {
	const nationAgendaItems = new Map<string, NationAgendaItem[]>();
	for (const committee of committees) {
		for (const nation of committee.nations) {
			const existing = nationAgendaItems.get(nation.alpha3Code) ?? [];
			for (const agendaItem of committee.agendaItems) {
				existing.push({
					agendaItemId: agendaItem.id,
					agendaItemTitle: agendaItem.title,
					committeeAbbreviation: committee.abbreviation
				});
			}
			nationAgendaItems.set(nation.alpha3Code, existing);
		}
	}
	return nationAgendaItems;
}

function nationFlagsOf(
	committees: FlagSources['committees'],
	nationPieceStates: Map<string, PieceInfo>
): FlagProgress[] {
	const nationFlags: FlagProgress[] = [];

	for (const [alpha3Code, agendaItems] of nationAgendaItemsOf(committees)) {
		if (agendaItems.length === 0) continue;

		const nation = committees
			.flatMap((committee) => committee.nations)
			.find((candidate) => candidate.alpha3Code === alpha3Code);
		if (!nation) continue;

		const pieces: FlagPiece[] = agendaItems.map((agendaItem) => {
			const key = `${alpha3Code}:${agendaItem.agendaItemId}`;
			const info = nationPieceStates.get(key);
			return {
				id: key,
				agendaItemId: agendaItem.agendaItemId,
				agendaItemTitle: agendaItem.agendaItemTitle,
				committeeAbbreviation: agendaItem.committeeAbbreviation,
				state: pieceState(Boolean(info?.hasReview), Boolean(info?.hasPaper))
			};
		});
		const { foundPieces, unlockedPieces } = progressOf(pieces);

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
	return nationFlags;
}

/** Non-state actors write a fixed number of papers, so their flags have a fixed size. */
function nsaFlagsOf(
	nsas: FlagSources['nsas'],
	nsaPaperInfo: Map<string, NsaPaperInfo>
): FlagProgress[] {
	return nsas.map((nsa) => {
		const info = nsaPaperInfo.get(nsa.id) ?? { totalPapers: 0, reviewedPapers: 0 };

		const pieces: FlagPiece[] = Array.from({ length: NSA_PIECE_COUNT }, (_unused, index) => ({
			id: `nsa:${nsa.id}:${index}`,
			agendaItemId: null,
			agendaItemTitle: index === 0 ? 'Introduction Paper' : `Paper ${index + 1}`,
			committeeAbbreviation: null,
			state: pieceState(info.reviewedPapers > index, info.totalPapers > index)
		}));
		const { foundPieces, unlockedPieces } = progressOf(pieces);

		return {
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
		};
	});
}

function statsOf(flags: FlagProgress[]): FlagCollectionStats {
	return {
		totalFlags: flags.length,
		completedFlags: flags.filter((flag) => flag.isComplete).length,
		totalPieces: flags.reduce((sum, flag) => sum + flag.totalPieces, 0),
		foundPieces: flags.reduce((sum, flag) => sum + flag.foundPieces, 0),
		unlockedPieces: flags.reduce((sum, flag) => sum + flag.unlockedPieces, 0)
	};
}

schemaBuilder.queryFields((t) => ({
	flagCollection: t.field({
		type: FlagCollectionDataRef,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertPaperReviewer(ctx, args.conferenceId);

			const sources = await fetchFlagSources(args.conferenceId);
			const { nationPieceStates, nsaPaperInfo } = tallyPapers(sources);

			const allFlags = [
				...nationFlagsOf(sources.committees, nationPieceStates),
				...nsaFlagsOf(sources.nsas, nsaPaperInfo)
			];

			// Most progress first, alphabetical within the same progress.
			allFlags.sort((a, b) => {
				const aProgress = a.foundPieces / a.totalPieces;
				const bProgress = b.foundPieces / b.totalPieces;
				if (bProgress !== aProgress) return bProgress - aProgress;
				return a.name.localeCompare(b.name);
			});

			return { flags: allFlags, stats: statsOf(allFlags) };
		}
	})
}));
