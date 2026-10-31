import { describe, expect, it, test } from 'vitest';
import { isForeignKeyViolation, isSerializationFailure, isUniqueViolationOn } from './errors';

describe('isForeignKeyViolation', () => {
	it('finds the code on the error or on what drizzle wrapped', () => {
		expect(isForeignKeyViolation({ code: '23503' })).toBe(true);
		expect(isForeignKeyViolation(new Error('query failed', { cause: { code: '23503' } }))).toBe(
			true
		);
	});

	it('ignores other errors', () => {
		expect(isForeignKeyViolation({ code: '23505' })).toBe(false);
		expect(isForeignKeyViolation(null)).toBe(false);
	});
});

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

const violation = {
	code: '23505',
	constraint: 'user_email_unique',
	detail: 'Key (email)=(x) exists'
};

describe('isUniqueViolationOn', () => {
	test('recognises a unique violation by constraint name or detail', () => {
		expect(isUniqueViolationOn({ error: violation, column: 'email' })).toBe(true);
		expect(
			isUniqueViolationOn({
				error: { code: '23505', constraint: 'user_email_key' },
				column: 'email'
			})
		).toBe(true);
		expect(
			isUniqueViolationOn({ error: { code: '23505', detail: 'Key (email)=(x)' }, column: 'email' })
		).toBe(true);
	});

	test('ignores violations on other columns and other errors', () => {
		expect(isUniqueViolationOn({ error: violation, column: 'phone' })).toBe(false);
		expect(isUniqueViolationOn({ error: { code: '23505' }, column: 'email' })).toBe(false);
		expect(isUniqueViolationOn({ error: { ...violation, code: '23503' }, column: 'email' })).toBe(
			false
		);
	});

	test('ignores values that are not error objects', () => {
		expect(isUniqueViolationOn({ error: null, column: 'email' })).toBe(false);
		expect(isUniqueViolationOn({ error: undefined, column: 'email' })).toBe(false);
		expect(isUniqueViolationOn({ error: '23505 email', column: 'email' })).toBe(false);
	});

	test("looks through the error drizzle wraps the driver's in", () => {
		expect(
			isUniqueViolationOn({
				error: new Error('query failed', { cause: violation }),
				column: 'email'
			})
		).toBe(true);
		expect(isUniqueViolationOn({ error: new Error('query failed'), column: 'email' })).toBe(false);
	});
});
