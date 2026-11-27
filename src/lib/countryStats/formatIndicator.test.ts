import { describe, expect, test } from 'vitest';
import { formatIndicator } from './formatIndicator';

/** Intl separates currency and number with a no-break space; compare with plain ones. */
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formatIndicator', () => {
	test.each([
		['compact', 83_280_000, 'de', '83,3 Mio.'],
		['compact', 83_280_000, 'en', '83.3M'],
		['compact', 1_420_000_000, 'de', '1,4 Mrd.'],
		['usdCompact', 4_500_000_000_000, 'de', '4,5 Bio. $'],
		['usdCompact', 4_500_000_000_000, 'en', '$4.5T'],
		['usd', 52_745.76, 'de', '52.746 $'],
		['usd', 52_745.76, 'en', '$52,746'],
		['decimal', 80.94, 'de', '80,9'],
		['percent', 3.12, 'de', '3,1 %'],
		['percent', 3.12, 'en', '3.1%']
	] as const)('%s %d in %s reads %s', (format, value, locale, expected) => {
		expect(plain(formatIndicator({ value, format, locale }))).toBe(expected);
	});
});
