import { describe, expect, test, vi } from 'vitest';
import type { DueEmail } from './dueEmails';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('./mailTransport', () => ({ mailTransport: {} }));
vi.mock('#api/pubsub', () => ({ emailLogPubsub: { updated: () => undefined } }));

const { personEmailsOf } = await import('./personEmails');

const user = (id: string) => ({
	id,
	email: `${id}@example.org`,
	givenName: 'Ada',
	familyName: 'Lovelace',
	locale: 'en',
	birthday: null
});

const due: DueEmail[] = [
	{ kind: 'PAYMENT_RECEIVED', subjectKey: 'payment', recipient: user('u1') },
	{
		kind: 'PAPERWORK_PROBLEM',
		subjectKey: 'mediaConsent',
		recipient: user('u1'),
		field: 'mediaConsent'
	},
	{ kind: 'PAYMENT_RECEIVED', subjectKey: 'payment', recipient: user('u2') }
];

const at = (iso: string) => new Date(iso);

describe('personEmailsOf', () => {
	test("lists the person's mails only, with whether the conference sends them itself", () => {
		const emails = personEmailsOf({
			due,
			userId: 'u1',
			enabled: new Set(['PAYMENT_RECEIVED']),
			logs: []
		});
		expect(emails.map((email) => [email.kind, email.automatic, email.lastStatus])).toEqual([
			['PAYMENT_RECEIVED', true, null],
			['PAPERWORK_PROBLEM', false, null]
		]);
		expect(emails[1]?.detail).toBeTruthy();
	});

	test('shows the latest try of each mail, automatic or by hand', () => {
		const [payment] = personEmailsOf({
			due,
			userId: 'u1',
			enabled: new Set(),
			logs: [
				{
					kind: 'PAYMENT_RECEIVED',
					subjectKey: 'payment',
					status: 'FAILED',
					createdAt: at('2026-10-01T10:00:00Z'),
					sentAt: null
				},
				{
					kind: 'PAYMENT_RECEIVED',
					subjectKey: 'payment',
					status: 'SENT',
					createdAt: at('2026-10-02T10:00:00Z'),
					sentAt: at('2026-10-02T10:00:05Z')
				},
				{
					kind: 'PAPERWORK_PROBLEM',
					subjectKey: 'payment',
					status: 'SENT',
					createdAt: at('2026-10-03T10:00:00Z'),
					sentAt: null
				}
			]
		});
		expect(payment).toMatchObject({ lastStatus: 'SENT', lastAt: at('2026-10-02T10:00:05Z') });
	});
});
