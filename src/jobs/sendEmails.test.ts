import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendDueEmails = vi.fn();
const conferencesSendingEmails = vi.fn();

vi.mock('#api/handlers/email/emailSweep', () => ({ sendDueEmails }));
vi.mock('#api/handlers/email/emailSettings', () => ({ conferencesSendingEmails }));
vi.mock('./config', () => ({
	sendEmailsConfig: () => ({ APP_URL: 'https://delegator.example.org/some/path' })
}));

const { runSendEmails } = await import('./sendEmails');

const round = (sent: number, remaining: number) => ({ sent, failed: 0, remaining });

beforeEach(() => {
	sendDueEmails.mockReset();
	conferencesSendingEmails.mockReset();
});

describe('runSendEmails', () => {
	it('sweeps each conference until nothing is left, linking to the origin of APP_URL', async () => {
		conferencesSendingEmails.mockResolvedValue(['a', 'b']);
		sendDueEmails
			.mockResolvedValueOnce(round(200, 5))
			.mockResolvedValueOnce(round(5, 0))
			.mockResolvedValueOnce(round(0, 0));
		await runSendEmails();
		expect(sendDueEmails.mock.calls).toEqual([
			[{ conferenceId: 'a', origin: 'https://delegator.example.org' }],
			[{ conferenceId: 'a', origin: 'https://delegator.example.org' }],
			[{ conferenceId: 'b', origin: 'https://delegator.example.org' }]
		]);
	});

	it('stops a conference whose round got nowhere, though mails remain', async () => {
		conferencesSendingEmails.mockResolvedValue(['a']);
		sendDueEmails.mockResolvedValue(round(0, 3));
		await runSendEmails();
		expect(sendDueEmails).toHaveBeenCalledTimes(1);
	});

	it('gives up on a conference after a bounded number of rounds', async () => {
		conferencesSendingEmails.mockResolvedValue(['a']);
		sendDueEmails.mockResolvedValue(round(1, 1));
		await runSendEmails();
		expect(sendDueEmails).toHaveBeenCalledTimes(50);
	});
});
