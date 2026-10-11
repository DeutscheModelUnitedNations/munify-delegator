import { describe, expect, test } from 'vitest';
import { describeEmailConflict, errorCause, isUniqueViolationOn, maskEmail } from './emailConflict';

const violation = {
	code: '23505',
	constraint: 'user_email_unique',
	detail: 'Key (email)=(x) exists'
};

describe('errorCause', () => {
	test('unwraps the cause an error carries', () => {
		const cause = { code: '23505' };
		expect(errorCause(new Error('query failed', { cause }))).toBe(cause);
	});

	test('passes anything else through', () => {
		const error = new Error('plain');
		expect(errorCause(error)).toBe(error);
		expect(errorCause(violation)).toBe(violation);
		expect(errorCause(null)).toBeNull();
	});
});

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
});

describe('maskEmail', () => {
	test('keeps the first two characters of a longer local part, one of a short one, and the domain', () => {
		expect(maskEmail('erika@example.org')).toBe('er***@example.org');
		expect(maskEmail('ab@example.org')).toBe('a***@example.org');
		expect(maskEmail('a@example.org')).toBe('a***@example.org');
		expect(maskEmail('@example.org')).toBe('***@example.org');
	});

	test('hides an address without a domain entirely', () => {
		expect(maskEmail('erika')).toBe('***');
	});
});

describe('describeEmailConflict', () => {
	test('describes a new account whose address is taken', () => {
		const conflict = describeEmailConflict('oidc|0123456789', 'erika@example.org', undefined);
		expect(conflict).toEqual({
			isNewUser: true,
			maskedConflictingEmail: 'er***@example.org',
			maskedExistingEmail: undefined,
			refId: '23456789',
			label: 'New user',
			scenario: 'new_user',
			details: {
				userSubject: 'oidc|0123456789',
				conflictingEmail: 'er***@example.org',
				existingUserEmail: 'N/A',
				refId: '23456789'
			},
			redirectTo: '/auth/email-conflict?scenario=new&email=er***%40example.org&ref=23456789'
		});
	});

	test('describes an existing account changing to a taken address', () => {
		const conflict = describeEmailConflict('u1', 'new@example.org', { email: 'old@example.org' });
		expect(conflict.isNewUser).toBe(false);
		expect(conflict.label).toBe('Email change');
		expect(conflict.scenario).toBe('email_change');
		expect(conflict.details.existingUserEmail).toBe('ol***@example.org');
		expect(conflict.redirectTo).toBe(
			'/auth/email-conflict?scenario=change&email=ne***%40example.org&ref=u1&existingEmail=ol***%40example.org'
		);
	});

	test('leaves out an existing account without an address', () => {
		const conflict = describeEmailConflict('u1', 'new@example.org', { email: null });
		expect(conflict.maskedExistingEmail).toBeUndefined();
		expect(conflict.redirectTo).not.toContain('existingEmail');
	});

	test('masks with the given function', () => {
		const conflict = describeEmailConflict('u1', 'new@example.org', { email: 'old@x' }, () => '#');
		expect(conflict.maskedConflictingEmail).toBe('#');
		expect(conflict.maskedExistingEmail).toBe('#');
	});
});
