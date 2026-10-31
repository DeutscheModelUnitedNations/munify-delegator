import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/services/email/emailService', () => ({ emailService: {} }));
vi.mock('#api/pubsub', () => ({ emailLogPubsub: { updated: () => undefined } }));
vi.mock('#api/services/email/templates/index', () => ({
	renderEmail: () => undefined,
	NotificationEmail: undefined
}));
vi.mock('#api/services/requestLocale', () => ({
	localeOfUser: () => 'de',
	runWithLocale: ({ fn }: { locale: string; fn: () => unknown }) => fn()
}));

const { isOpen, stillOpen } = await import('./emailSweep');
const { errorText, sendingError } = await import('./emailDelivery');

const now = new Date('2026-11-01T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe('isOpen', () => {
	test('sends what has no log row yet', () => {
		expect(isOpen({ log: undefined, now })).toBe(true);
	});

	test('never sends twice what was sent or skipped', () => {
		expect(isOpen({ log: { status: 'SENT', attempts: 1, updatedAt: minutesAgo(600) }, now })).toBe(
			false
		);
		expect(
			isOpen({ log: { status: 'SKIPPED', attempts: 0, updatedAt: minutesAgo(600) }, now })
		).toBe(false);
	});

	test('tries a failed mail three times', () => {
		expect(isOpen({ log: { status: 'FAILED', attempts: 2, updatedAt: now }, now })).toBe(true);
		expect(isOpen({ log: { status: 'FAILED', attempts: 3, updatedAt: now }, now })).toBe(false);
	});

	test('takes over a claim only once it is stale', () => {
		expect(isOpen({ log: { status: 'SENDING', attempts: 1, updatedAt: minutesAgo(5) }, now })).toBe(
			false
		);
		expect(
			isOpen({ log: { status: 'SENDING', attempts: 1, updatedAt: minutesAgo(20) }, now })
		).toBe(true);
	});
});

describe('sendingError', () => {
	test('is nothing for a sent mail', () => {
		expect(sendingError({ success: true })).toBeUndefined();
	});

	test("is the mail service's reason, or a placeholder without one", () => {
		expect(sendingError({ success: false, error: 'mailbox full' })).toBe('mailbox full');
		expect(sendingError({ success: false })).toBe('unknown error');
	});
});

describe('errorText', () => {
	test('reads the message of an error and stringifies anything else', () => {
		expect(errorText(new Error('template broke'))).toBe('template broke');
		expect(errorText('timeout')).toBe('timeout');
		expect(errorText(undefined)).toBe('undefined');
	});
});

describe('stillOpen', () => {
	const recipient = {
		id: 'u1',
		email: 'ada@example.org',
		givenName: 'Ada',
		familyName: 'Lovelace',
		locale: 'de',
		birthday: null
	};
	const due = [
		{ kind: 'PAYMENT_RECEIVED' as const, subjectKey: 'payment', recipient },
		{ kind: 'OPEN_ISSUES_REMINDER' as const, subjectKey: 'open-issues', recipient }
	];
	const kinds = new Set(due.map((email) => email.kind));
	const log = (overrides: {
		kind: (typeof due)[number]['kind'];
		subjectKey: string;
		trigger: 'AUTOMATIC' | 'MANUAL';
		status: 'SENT' | 'FAILED';
	}) => ({ userId: 'u1', attempts: 1, updatedAt: minutesAgo(60), ...overrides });
	const open = (logs: ReturnType<typeof log>[]) =>
		stillOpen({ due, logs, kinds, now }).map((email) => email.kind);

	test('leaves out a mail sent by hand, so it is not sent twice', () => {
		expect(
			open([
				log({ kind: 'PAYMENT_RECEIVED', subjectKey: 'payment', trigger: 'MANUAL', status: 'SENT' })
			])
		).toEqual(['OPEN_ISSUES_REMINDER']);
	});

	test('still sends a reminder that was sent early by hand', () => {
		expect(
			open([
				log({
					kind: 'OPEN_ISSUES_REMINDER',
					subjectKey: 'open-issues',
					trigger: 'MANUAL',
					status: 'SENT'
				})
			])
		).toEqual(['PAYMENT_RECEIVED', 'OPEN_ISSUES_REMINDER']);
	});

	test('does not count a failed manual send as sent', () => {
		expect(
			open([
				log({
					kind: 'PAYMENT_RECEIVED',
					subjectKey: 'payment',
					trigger: 'MANUAL',
					status: 'FAILED'
				})
			])
		).toEqual(['PAYMENT_RECEIVED', 'OPEN_ISSUES_REMINDER']);
	});

	test('only sends the kinds asked for', () => {
		expect(
			stillOpen({ due, logs: [], kinds: new Set(['PAYMENT_RECEIVED']), now }).map((e) => e.kind)
		).toEqual(['PAYMENT_RECEIVED']);
	});
});
