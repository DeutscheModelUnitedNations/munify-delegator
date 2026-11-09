import { describe, expect, test } from 'vitest';
import { asCount, containing } from './queryHelpers';

describe('containing', () => {
	test('matches the text literally anywhere', () => {
		expect(containing('50%_a\\b')).toEqual({ ilike: '%50\\%\\_a\\\\b%' });
	});
});

describe('asCount', () => {
	test('reads a count as a number', () => {
		expect(asCount(3)).toBe(3);
		expect(asCount('4')).toBe(4);
	});
});
