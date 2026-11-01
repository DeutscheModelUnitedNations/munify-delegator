import { describe, expect, test } from 'vitest';
import { layoutCertificateSessions, sessionsFromClaim } from './certificateSessionLayout';

// every character is as wide as the font size: easy to reason about
const measure = (text: string, size: number) => text.length * size;
const options = { pageWidth: 600, top: 400, bottom: 100, measure };
const sessions = (count: number) => Array.from({ length: count }, (_, i) => `S${i}`);

describe('layoutCertificateSessions', () => {
	test('draws nothing without sessions', () => {
		expect(
			layoutCertificateSessions({ sessions: [], heading: 'Heading', options })
		).toBeUndefined();
	});

	test('puts a few sessions in one centered column below the heading', () => {
		const layout = layoutCertificateSessions({ sessions: sessions(3), heading: 'Head', options });
		expect(layout).toBeDefined();
		if (!layout) return;
		expect(new Set(layout.rows.map((row) => row.x)).size).toBe(1);
		expect(layout.rows.every((row) => row.y < layout.heading.y)).toBe(true);
		// the block (checkmark, gap, text) is centered
		const width = layout.box + 5 + measure('S0', layout.size);
		expect(layout.rows[0].x).toBeCloseTo((600 - width) / 2);
	});

	test('splits many sessions into columns, filled top to bottom', () => {
		const layout = layoutCertificateSessions({ sessions: sessions(10), heading: 'Head', options });
		expect(layout?.rows).toHaveLength(10);
		const xs = [...new Set(layout?.rows.map((row) => row.x))];
		expect(xs).toHaveLength(2);
		expect(layout?.rows.filter((row) => row.x === xs[0])).toHaveLength(5);
	});

	test('shrinks to fit above the bottom, and never draws below it', () => {
		const tight = { ...options, top: 160, bottom: 100 };
		const layout = layoutCertificateSessions({
			sessions: sessions(6),
			heading: 'Head',
			options: tight
		});
		expect(layout?.size).toBeLessThan(9);
		expect(layout?.rows.every((row) => row.y >= 100)).toBe(true);
	});
});

describe('sessionsFromClaim', () => {
	test('reads the signed session names', () => {
		expect(sessionsFromClaim(['Eröffnung', 'Abend'])).toEqual(['Eröffnung', 'Abend']);
	});

	test('states none for an absent or malformed claim', () => {
		expect(sessionsFromClaim(undefined)).toEqual([]);
		expect(sessionsFromClaim([['Eröffnung', 1]])).toEqual([]);
		expect(sessionsFromClaim('Eröffnung')).toEqual([]);
	});
});
