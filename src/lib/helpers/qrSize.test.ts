import { describe, expect, it } from 'vitest';
import { POINTS_PER_MM } from './documentLayout';
import { fitQrSquare, MIN_MODULE_MM, minQrSide, qrMatrix, QUIET_ZONE_MODULES } from './qrSize';

/** A signed document code's link as it is printed: about 250 characters. */
const documentLink = `HTTPS://DELEGATOR.DMUN.DE/ID/${'SA24D8G14U2420D0B0VA8QBBC5Q0C6KAN4VQ'.repeat(6)}`;
const page = { width: 595, height: 842 };

describe('qrMatrix', () => {
	it('needs more modules for an emblem, which takes the highest error correction', () => {
		const plain = qrMatrix({ text: documentLink, withEmblem: false });
		const withEmblem = qrMatrix({ text: documentLink, withEmblem: true });
		expect(withEmblem.size).toBeGreaterThan(plain.size);
		// the finder pattern's corner is dark, its separator light
		expect(plain.has(0, 0)).toBe(true);
		expect(plain.has(7, 7)).toBe(false);
	});
});

describe('minQrSide', () => {
	it('keeps every module at least the minimum, the quiet zone or the card padding included', () => {
		const modules = 53;
		const plain = minQrSide({ modules, corporate: false });
		expect(plain / (modules + 2 * QUIET_ZONE_MODULES)).toBeCloseTo(MIN_MODULE_MM * POINTS_PER_MM);
		const corporate = minQrSide({ modules, corporate: true });
		expect((corporate * 0.88) / modules).toBeCloseTo(MIN_MODULE_MM * POINTS_PER_MM);
	});

	it('asks about 28 mm for a printed document code', () => {
		const { size } = qrMatrix({ text: documentLink, withEmblem: false });
		const side = minQrSide({ modules: size, corporate: false }) / POINTS_PER_MM;
		expect(side).toBeGreaterThan(25);
		expect(side).toBeLessThanOrEqual(28);
	});
});

describe('fitQrSquare', () => {
	it('keeps a code that is large enough where it was placed', () => {
		const square = { left: 100, bottom: 100, side: 80 };
		expect(fitQrSquare({ square, minSide: 70, page })).toEqual(square);
	});

	it('grows a small code around its centre', () => {
		expect(
			fitQrSquare({ square: { left: 100, bottom: 100, side: 40 }, minSide: 80, page })
		).toEqual({ left: 80, bottom: 80, side: 80 });
	});

	it('moves a grown code back onto the page and never makes it larger than the page', () => {
		expect(fitQrSquare({ square: { left: 575, bottom: 0, side: 20 }, minSide: 80, page })).toEqual({
			left: 515,
			bottom: 0,
			side: 80
		});
		expect(fitQrSquare({ square: { left: 0, bottom: 0, side: 20 }, minSide: 900, page }).side).toBe(
			595
		);
	});
});
