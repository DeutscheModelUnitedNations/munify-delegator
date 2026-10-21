import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as Sentry from '@sentry/sveltekit';
import { hasErrorCode } from '#lib/api/errorCodes.js';
import { CombinedError } from '@urql/core';
import {
	describeEmailConflict,
	emailConflictError,
	maskEmail,
	reportEmailConflict
} from './emailConflict';

const findFirst = vi.hoisted(() => vi.fn());
vi.mock('$api/db/db', () => ({ db: { query: { user: { findFirst } } } }));
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

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

	test('answers as an EMAIL_CONFLICT error carrying the page to show', () => {
		const conflict = describeEmailConflict('u1', 'new@example.org', { email: 'old@example.org' });
		const error = emailConflictError(conflict);
		expect(hasErrorCode(new CombinedError({ graphQLErrors: [error] }), 'EMAIL_CONFLICT')).toBe(
			true
		);
		expect(error.extensions).toMatchObject({
			isNewUser: false,
			maskedConflictingEmail: 'ne***@example.org',
			maskedExistingEmail: 'ol***@example.org',
			refId: 'u1',
			redirectTo: conflict.redirectTo
		});
	});
});

describe('reportEmailConflict', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	test("looks up the caller's row to tell a new account from an email change", async () => {
		findFirst.mockResolvedValueOnce({ email: 'old@example.org' });
		const conflict = await reportEmailConflict('u1', 'new@example.org', new Error('taken'));
		expect(findFirst).toHaveBeenCalledWith({ where: { id: 'u1' }, columns: { email: true } });
		expect(conflict.isNewUser).toBe(false);
		expect(conflict.maskedExistingEmail).toBe('ol***@example.org');
	});

	test('reports the masked conflict to Sentry, never the whole address', async () => {
		findFirst.mockResolvedValueOnce(undefined);
		const error = new Error('taken');
		await reportEmailConflict('u1', 'new@example.org', error);
		expect(Sentry.captureException).toHaveBeenCalledWith(error, {
			level: 'warning',
			tags: { error_type: 'email_conflict', scenario: 'new_user' },
			extra: {
				userSubject: 'u1',
				conflictingEmail: 'ne***@example.org',
				existingUserEmail: 'N/A',
				refId: 'u1'
			}
		});
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('new@example.org');
	});
});
