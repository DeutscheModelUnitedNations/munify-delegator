/** The flag piece a review unlocked, as the piece-found modal shows it. */
export interface UnlockedPiece {
	flagName: string;
	flagAlpha2Code: string | null;
	flagAlpha3Code: string | null;
	flagType: 'NATION' | 'NSA';
	fontAwesomeIcon: string | null;
	pieceName: string;
	isComplete: boolean;
	foundCount: number;
	totalCount: number;
}

/** The piece a submitted review unlocked, or null if it did not unlock one. */
export function unlockedPiece(result: {
	pieceUnlocked: boolean;
	unlockedPieceData: {
		flagName: string;
		flagAlpha2Code?: string | null;
		flagAlpha3Code?: string | null;
		flagType: 'NATION' | 'NSA';
		fontAwesomeIcon?: string | null;
		pieceName: string;
		isComplete: boolean;
		foundCount: number;
		totalCount: number;
	} | null;
}): UnlockedPiece | null {
	const unlocked = result.pieceUnlocked ? result.unlockedPieceData : null;
	if (!unlocked) return null;
	return {
		flagName: unlocked.flagName,
		flagAlpha2Code: unlocked.flagAlpha2Code ?? null,
		flagAlpha3Code: unlocked.flagAlpha3Code ?? null,
		flagType: unlocked.flagType,
		fontAwesomeIcon: unlocked.fontAwesomeIcon ?? null,
		pieceName: unlocked.pieceName,
		isComplete: unlocked.isComplete,
		foundCount: unlocked.foundCount,
		totalCount: unlocked.totalCount
	};
}
