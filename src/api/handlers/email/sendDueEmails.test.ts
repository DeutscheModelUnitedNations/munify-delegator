import { describe, expect, test, vi } from 'vitest';

const findSettings = vi.fn(async () => [{ kind: 'POSTAL_UNLOCKED' }]);
vi.mock('#api/db/db', () => ({
	db: { query: { conferenceEmailSetting: { findMany: findSettings } } },
	schema: {}
}));
const loadEmailSnapshot = vi.fn(async () => undefined);
vi.mock('./emailSnapshot', () => ({ loadEmailSnapshot }));
vi.mock('./mailTransport', () => ({ mailTransport: {} }));
vi.mock('#api/pubsub', () => ({ emailLogPubsub: {}, conferenceEmailSettingPubsub: {} }));
vi.mock('./templates/index', () => ({
	renderEmail: () => undefined,
	NotificationEmail: undefined
}));
vi.mock('#api/services/requestLocale', () => ({ localeOfUser: () => 'de' }));

const { countOpenEmails, sendDueEmails } = await import('./emailSweep');

describe('sendDueEmails', () => {
	test('sends the kinds switched to automatic when none are given', async () => {
		findSettings.mockClear();
		await sendDueEmails({ conferenceId: 'c', origin: 'https://example.org' });
		expect(findSettings).toHaveBeenCalledOnce();
		expect(loadEmailSnapshot).toHaveBeenCalledWith('c');
	});

	test('sends the kinds the team picked, switched to automatic or not', async () => {
		findSettings.mockClear();
		loadEmailSnapshot.mockClear();
		const result = await sendDueEmails({
			conferenceId: 'c',
			origin: 'https://example.org',
			kinds: new Set(['ASSIGNMENT_ACCEPTED'])
		});
		expect(findSettings).not.toHaveBeenCalled();
		expect(loadEmailSnapshot).toHaveBeenCalledWith('c');
		expect(result).toEqual({ sent: 0, failed: 0, remaining: 0 });
	});
});

describe('countOpenEmails', () => {
	test('answers every kind asked for, none open without the conference', async () => {
		expect(
			await countOpenEmails({ conferenceId: 'c', kinds: ['POSTAL_UNLOCKED', 'PAYMENT_UNLOCKED'] })
		).toEqual([
			{ kind: 'POSTAL_UNLOCKED', open: 0 },
			{ kind: 'PAYMENT_UNLOCKED', open: 0 }
		]);
	});
});
