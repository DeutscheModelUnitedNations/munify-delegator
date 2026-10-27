import { describe, expect, it } from 'vitest';
import { isLookupReady, normalizeEntryCode } from './entryCode';

describe('isLookupReady', () => {
	it('looks a full-length code up at once', () => {
		expect(isLookupReady('BCDFGHJK', false)).toBe(true);
	});

	it('looks a six-letter code from before up only once typing paused', () => {
		expect(isLookupReady('BCDFGH', false)).toBe(false);
		expect(isLookupReady('BCDFGH', true)).toBe(true);
	});

	it('never looks other lengths up', () => {
		for (const code of ['', 'BCD', 'BCDFGHJ']) expect(isLookupReady(code, true)).toBe(false);
	});
});

describe('normalizeEntryCode', () => {
	it('trims and uppercases what people paste', () => {
		expect(normalizeEntryCode('  bcdfghjk ')).toBe('BCDFGHJK');
	});
});
