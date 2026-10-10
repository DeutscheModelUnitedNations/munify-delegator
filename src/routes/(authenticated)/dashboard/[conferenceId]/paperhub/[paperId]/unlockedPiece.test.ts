import { describe, expect, test } from 'vitest';
import { unlockedPiece, type UnlockedPiece } from './unlockedPiece';

const piece: UnlockedPiece = {
	flagName: 'Germany',
	flagAlpha2Code: 'de',
	flagAlpha3Code: 'deu',
	flagType: 'NATION',
	fontAwesomeIcon: null,
	pieceName: 'North',
	isComplete: false,
	foundCount: 2,
	totalCount: 9
};

describe('unlockedPiece', () => {
	test('is null when the review did not unlock a piece', () => {
		expect(unlockedPiece({ pieceUnlocked: false, unlockedPieceData: piece })).toBeNull();
		expect(unlockedPiece({ pieceUnlocked: true, unlockedPieceData: null })).toBeNull();
	});

	test('hands the unlocked piece to the modal', () => {
		expect(unlockedPiece({ pieceUnlocked: true, unlockedPieceData: piece })).toEqual(piece);
	});

	test('turns missing codes and icons into null', () => {
		expect(
			unlockedPiece({
				pieceUnlocked: true,
				unlockedPieceData: {
					flagName: 'Amnesty',
					flagType: 'NSA',
					fontAwesomeIcon: 'candle',
					pieceName: 'Corner',
					isComplete: true,
					foundCount: 9,
					totalCount: 9
				}
			})
		).toEqual({
			flagName: 'Amnesty',
			flagAlpha2Code: null,
			flagAlpha3Code: null,
			flagType: 'NSA',
			fontAwesomeIcon: 'candle',
			pieceName: 'Corner',
			isComplete: true,
			foundCount: 9,
			totalCount: 9
		});
	});
});
