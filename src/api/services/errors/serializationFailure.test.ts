import { describe, expect, it } from 'vitest';
import { isSerializationFailure } from './serializationFailure';

describe('isSerializationFailure', () => {
	it('finds the code on the error or on what drizzle wrapped', () => {
		expect(isSerializationFailure({ code: '40001' })).toBe(true);
		expect(isSerializationFailure(new Error('query failed', { cause: { code: '40001' } }))).toBe(
			true
		);
	});

	it('ignores other errors', () => {
		expect(isSerializationFailure({ code: '23505' })).toBe(false);
		expect(isSerializationFailure(new Error('40001'))).toBe(false);
		expect(isSerializationFailure(undefined)).toBe(false);
	});
});
