import { describe, expect, it } from 'vitest';
import { soleRow } from './soleRow';

describe('soleRow', () => {
	it('is the only row, or nothing', () => {
		expect(soleRow(['a'])).toBe('a');
		expect(soleRow([])).toBeUndefined();
		expect(soleRow(['a', 'b'])).toBeUndefined();
	});
});
