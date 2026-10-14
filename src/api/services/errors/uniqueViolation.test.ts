import { describe, expect, test } from 'vitest';
import { isUniqueViolationOn } from './uniqueViolation';

const violation = {
	code: '23505',
	constraint: 'user_email_unique',
	detail: 'Key (email)=(x) exists'
};

describe('isUniqueViolationOn', () => {
	test('recognises a unique violation by constraint name or detail', () => {
		expect(isUniqueViolationOn(violation, 'email')).toBe(true);
		expect(isUniqueViolationOn({ code: '23505', constraint: 'user_email_key' }, 'email')).toBe(
			true
		);
		expect(isUniqueViolationOn({ code: '23505', detail: 'Key (email)=(x)' }, 'email')).toBe(true);
	});

	test('ignores violations on other columns and other errors', () => {
		expect(isUniqueViolationOn(violation, 'phone')).toBe(false);
		expect(isUniqueViolationOn({ code: '23505' }, 'email')).toBe(false);
		expect(isUniqueViolationOn({ ...violation, code: '23503' }, 'email')).toBe(false);
	});

	test('ignores values that are not error objects', () => {
		expect(isUniqueViolationOn(null, 'email')).toBe(false);
		expect(isUniqueViolationOn(undefined, 'email')).toBe(false);
		expect(isUniqueViolationOn('23505 email', 'email')).toBe(false);
	});

	test("looks through the error drizzle wraps the driver's in", () => {
		expect(isUniqueViolationOn(new Error('query failed', { cause: violation }), 'email')).toBe(
			true
		);
		expect(isUniqueViolationOn(new Error('query failed'), 'email')).toBe(false);
	});
});
