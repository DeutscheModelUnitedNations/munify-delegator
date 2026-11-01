import { describe, expect, test } from 'vitest';
import { ensureSent, owedEmailState, owedEmailTitle, wasSent, type OwedEmail } from './owedEmails';

const email = (overrides: Partial<OwedEmail> = {}): OwedEmail => ({
	kind: 'PAPERWORK_PROBLEM',
	subjectKey: 'mediaConsent',
	detail: null,
	automatic: false,
	lastStatus: null,
	lastAt: null,
	...overrides
});

describe('owed emails', () => {
	test('name what tells two mails of a kind apart', () => {
		const title = owedEmailTitle(email());
		expect(owedEmailTitle(email({ detail: 'Media' }))).toBe(`${title}: Media`);
	});

	test('say whether a mail was never sent, or how the last try went', () => {
		const never = owedEmailState(email());
		const tried = owedEmailState(
			email({ automatic: true, lastStatus: 'FAILED', lastAt: new Date('2026-10-01T10:00:00Z') })
		);
		expect(never).not.toBe(tried);
		expect(tried).toContain('·');
		expect(wasSent(email({ lastStatus: 'SENT' }))).toBe(true);
		expect(wasSent(email({ lastStatus: 'FAILED' }))).toBe(false);
	});

	test('turn a refused send into an error carrying the reason', () => {
		expect(() => ensureSent({ sent: true, error: null })).not.toThrow();
		expect(() => ensureSent({ sent: false, error: 'mailbox full' })).toThrow('mailbox full');
	});
});
