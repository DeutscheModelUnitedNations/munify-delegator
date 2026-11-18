import { describe, expect, test, vi } from 'vitest';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({
	DATABASE_URL: '',
	DATABASE_POOL_SIZE: 1,
	REDIS_URL: undefined
}));

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('./mailTransport', () => ({ mailTransport: {} }));
vi.mock('#api/pubsub', () => ({
	emailLogPubsub: { created: vi.fn(), updated: () => undefined },
	conferenceEmailSettingPubsub: { updated: () => undefined }
}));
vi.mock('./templates/index', () => ({
	renderEmail: () => undefined,
	NotificationEmail: undefined
}));
vi.mock('#api/services/requestLocale', () => ({
	localeOfUser: () => 'de',
	runWithLocale: ({ fn }: { locale: string; fn: () => unknown }) => fn()
}));

// What the conference owes is dueEmails' (tested there): here it is whatever a test sets.
const owed: { due: unknown[] } = { due: [] };
vi.mock('./dueEmails', async (importOriginal) => ({
	...(await importOriginal<typeof import('./dueEmails')>()),
	dueEmails: () => owed.due
}));
vi.mock('./emailSnapshot', () => ({
	FIRST_EMAIL_PAGE: { part: 'people', after: null },
	loadEmailConference: vi.fn(),
	// one page holding the whole conference: what it owes is dueEmails', faked above
	emailPages: async function* ({ conference }: { conference: unknown }) {
		yield { snapshot: { conference }, cursor: { part: 'people', after: null }, next: null };
	}
}));

const { isOpen, sendOpenEmailsInBackground, skipOpenEmails, stillOpen } =
	await import('./emailSweep');
const { loadEmailConference } = await import('./emailSnapshot');
const { db } = await import('#api/db/db');
const { emailLogPubsub } = await import('#api/pubsub');
const { logger } = await import('#lib/logger');
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

describe('skipOpenEmails', () => {
	const recipient = { id: 'u1', email: 'ada@example.org' };
	// TYPE-SAFETY-EXCEPTION: dueEmails is faked above, so only openEmails reads the conference id
	const conference = { id: 'c1' } as Awaited<ReturnType<typeof loadEmailConference>>;
	/** The rows each insert wrote, one list per statement. */
	const inserts: { kind: string; status: string; subjectKey: string }[][] = [];
	Object.assign(db, {
		query: { emailLog: { findMany: async () => [] } },
		insert: () => ({
			values: (rows: { kind: string; status: string; subjectKey: string }[]) => {
				inserts.push(rows);
				return { onConflictDoNothing: async () => undefined };
			}
		})
	});
	const skip = (kinds: readonly ('PAYMENT_RECEIVED' | 'POSTAL_RECEIVED')[]) =>
		skipOpenEmails({ conferenceId: 'c1', kinds });

	test('marks what is owed of the kinds as skipped, 500 rows a statement', async () => {
		inserts.length = 0;
		vi.mocked(emailLogPubsub.created).mockClear();
		vi.mocked(loadEmailConference).mockResolvedValue(conference);
		owed.due = [
			...Array.from({ length: 501 }, (_, i) => ({
				kind: 'PAYMENT_RECEIVED',
				subjectKey: `payment-${i}`,
				recipient
			})),
			{ kind: 'POSTAL_RECEIVED', subjectKey: 'postal', recipient }
		];
		expect(await skip(['PAYMENT_RECEIVED'])).toBe(501);
		expect(inserts.map((rows) => rows.length)).toEqual([500, 1]);
		expect(inserts.flat().every((row) => row.status === 'SKIPPED')).toBe(true);
		expect(inserts.flat().some((row) => row.kind === 'POSTAL_RECEIVED')).toBe(false);
		expect(emailLogPubsub.created).toHaveBeenCalledOnce();
	});

	test('writes and announces nothing when nothing is owed', async () => {
		inserts.length = 0;
		vi.mocked(emailLogPubsub.created).mockClear();
		vi.mocked(loadEmailConference).mockResolvedValue(conference);
		owed.due = [];
		expect(await skip(['PAYMENT_RECEIVED'])).toBe(0);
		expect(await skip([])).toBe(0);
		vi.mocked(loadEmailConference).mockResolvedValue(undefined);
		expect(await skip(['PAYMENT_RECEIVED'])).toBe(0);
		expect(inserts).toEqual([]);
		expect(emailLogPubsub.created).not.toHaveBeenCalled();
	});
});

describe('sendOpenEmailsInBackground', () => {
	const start = (kinds: readonly ('PAYMENT_RECEIVED' | 'POSTAL_RECEIVED')[]) =>
		sendOpenEmailsInBackground({ conferenceId: 'c2', kinds, origin: 'https://example.org' });

	test('sends kinds asked for while a sweep runs once it is done, one sweep at a time', async () => {
		let release = () => {};
		vi.mocked(loadEmailConference).mockReset();
		vi.mocked(loadEmailConference)
			.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve(undefined))))
			.mockResolvedValue(undefined);
		start(['PAYMENT_RECEIVED']);
		start(['POSTAL_RECEIVED']);
		expect(loadEmailConference).toHaveBeenCalledOnce();
		release();
		await vi.waitFor(() => expect(loadEmailConference).toHaveBeenCalledTimes(2));
		// once the sweep is over, the next request starts one of its own
		await new Promise((resolve) => setTimeout(resolve, 0));
		start(['PAYMENT_RECEIVED']);
		expect(loadEmailConference).toHaveBeenCalledTimes(3);
	});

	test('logs a sweep that failed and lets the next one start', async () => {
		const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		vi.mocked(loadEmailConference).mockReset();
		vi.mocked(loadEmailConference)
			.mockRejectedValueOnce(new Error('down'))
			.mockResolvedValue(undefined);
		start(['PAYMENT_RECEIVED']);
		await vi.waitFor(() =>
			expect(logged).toHaveBeenCalledWith('Sending emails failed', expect.anything())
		);
		start(['PAYMENT_RECEIVED']);
		expect(loadEmailConference).toHaveBeenCalledTimes(2);
		logged.mockRestore();
	});
});
