import { describe, expect, it, test } from 'vitest';
import { GraphQLError } from 'graphql';
import {
	databaseRuleError,
	isForeignKeyViolation,
	isSerializationFailure,
	isUniqueViolationOn
} from './errors';

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

describe('databaseRuleError', () => {
	/** What graphql makes of a resolver that failed on drizzle's wrapped driver error. */
	const failed = (driverError: object) =>
		new GraphQLError('Failed query', {
			path: ['createCalendarEntry'],
			originalError: new Error('Failed query', { cause: driverError })
		});

	test.each([
		['calendar_entry_same_conference', 'INVALID_INPUT'],
		['calendar_entry_conference_immutable', 'INVALID_INPUT'],
		['resolution_conference_id_immutable', 'INVALID_INPUT'],
		['delegation_role_kind', 'INVALID_INPUT'],
		['calendar_entry_track_runs_on_day', 'INVALID_INPUT'],
		['one_part_per_conference', 'CONFLICT']
	])('answers %s as %s, at the same place', (constraint, code) => {
		const error = databaseRuleError(failed({ code: '23514', constraint }));
		expect(error?.extensions.code).toBe(code);
		expect(error?.path).toEqual(['createCalendarEntry']);
		expect(error?.originalError).toBeUndefined();
	});

	test('leaves other errors to the masking', () => {
		expect(databaseRuleError(failed({ code: '23514', constraint: 'conference_role_check' }))).toBe(
			undefined
		);
		expect(databaseRuleError(failed({ code: '23505', constraint: 'x_same_conference' }))).toBe(
			undefined
		);
		expect(databaseRuleError(new GraphQLError('no cause'))).toBe(undefined);
	});
});
