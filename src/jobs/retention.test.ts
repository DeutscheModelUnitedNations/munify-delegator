import { describe, expect, it } from 'vitest';
import { retentionCutoff } from './retention';

describe('retentionCutoff', () => {
	it('goes back the given number of days', () => {
		const now = new Date(2026, 9, 13, 12);
		expect(retentionCutoff(now, 30)).toEqual(new Date(2026, 8, 13, 12));
	});

	it('does not touch the date it was given', () => {
		const now = new Date(2026, 9, 13, 12);
		retentionCutoff(now, 30);
		expect(now).toEqual(new Date(2026, 9, 13, 12));
	});

	it('keeps nothing back for zero days', () => {
		const now = new Date(2026, 9, 13, 12);
		expect(retentionCutoff(now, 0)).toEqual(now);
	});
});
