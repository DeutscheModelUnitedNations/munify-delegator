import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendDueEmails = vi.fn();
const conferencesSendingEmails = vi.fn();

vi.mock('#api/handlers/email/emailSweep', () => ({ sendDueEmails }));
vi.mock('#api/handlers/email/emailSettings', () => ({ conferencesSendingEmails }));
vi.mock('./config', () => ({
	sendEmailsConfig: () => ({ APP_URL: 'https://delegator.example.org/some/path' })
}));

const { runSendEmails } = await import('./sendEmails');

const cursor = { part: 'people', after: 'p500' };
/** A round that sent `sent` mails and stopped short of the end, or not. */
const round = (sent: number, more: boolean) => ({ sent, failed: 0, next: more ? cursor : null });

beforeEach(() => {
	sendDueEmails.mockReset();
	conferencesSendingEmails.mockReset();
});

describe('runSendEmails', () => {
	it('sweeps each conference until nothing is left, going on where a round stopped, linking to the origin of APP_URL', async () => {
		conferencesSendingEmails.mockResolvedValue(['a', 'b']);
		sendDueEmails
			.mockResolvedValueOnce(round(200, true))
			.mockResolvedValueOnce(round(5, false))
			.mockResolvedValueOnce(round(0, false));
		await runSendEmails();
		expect(sendDueEmails.mock.calls).toEqual([
			[{ conferenceId: 'a', origin: 'https://delegator.example.org' }],
			[{ conferenceId: 'a', origin: 'https://delegator.example.org', from: cursor }],
			[{ conferenceId: 'b', origin: 'https://delegator.example.org' }]
		]);
	});

	it('stops a conference whose round got nowhere, though mails remain', async () => {
		conferencesSendingEmails.mockResolvedValue(['a']);
		sendDueEmails.mockResolvedValue(round(0, true));
		await runSendEmails();
		expect(sendDueEmails).toHaveBeenCalledTimes(1);
	});

	it('gives up on a conference after a bounded number of rounds', async () => {
		conferencesSendingEmails.mockResolvedValue(['a']);
		sendDueEmails.mockResolvedValue(round(1, true));
		await runSendEmails();
		expect(sendDueEmails).toHaveBeenCalledTimes(50);
	});
});
