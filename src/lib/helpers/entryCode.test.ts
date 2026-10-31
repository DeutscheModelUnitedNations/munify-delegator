import { describe, expect, it } from 'vitest';
import { isLookupReady, normalizeEntryCode } from './entryCode';

describe('isLookupReady', () => {
	it('looks a full-length code up at once', () => {
		expect(isLookupReady({ code: 'BCDFGHJK', settled: false })).toBe(true);
	});

	it('looks a six-letter code from before up only once typing paused', () => {
		expect(isLookupReady({ code: 'BCDFGH', settled: false })).toBe(false);
		expect(isLookupReady({ code: 'BCDFGH', settled: true })).toBe(true);
	});

	it('never looks other lengths up', () => {
		for (const code of ['', 'BCD', 'BCDFGHJ'])
			expect(isLookupReady({ code, settled: true })).toBe(false);
	});
});

describe('normalizeEntryCode', () => {
	it('trims and uppercases what people paste', () => {
		expect(normalizeEntryCode('  bcdfghjk ')).toBe('BCDFGHJK');
	});
});
