import { AsyncLocalStorage } from 'node:async_hooks';
import { sendDueEmails } from '#api/handlers/email/emailSweep';
import { conferencesSendingEmails } from '#api/handlers/email/emailSettings';
import { overwriteServerAsyncLocalStorage } from '#lib/paraglide/runtime';
import { sendEmailsConfig } from './config';
import { logger } from '#lib/logger';

/** Rounds per conference in one run at most, so a stuck sweep cannot keep the job alive. */
const MAX_ROUNDS = 50;

/**
 * Sends the mails that are due of the kinds switched to automatic, in every conference that has
 * any, through the same sweep as the team's "send now"; the team sends the others by hand from the
 * e-mail page. Every few minutes: the reminders are sent from here. The links in the mails point at
 * `APP_URL`.
 */
export async function runSendEmails() {
	const { APP_URL } = sendEmailsConfig();
	const origin = new URL(APP_URL).origin;
	// the app's requests get one from Paraglide's middleware; without it every mail would be in the
	// base locale, whatever `runWithLocale` asks for
	overwriteServerAsyncLocalStorage(new AsyncLocalStorage());
	for (const conferenceId of await conferencesSendingEmails()) {
		for (let round = 1; round <= MAX_ROUNDS; round++) {
			const { sent, failed, remaining } = await sendDueEmails({ conferenceId, origin });
			logger.info('Sent due emails', { conferenceId, round, sent, failed, remaining });
			if (remaining === 0 || sent + failed === 0) break;
		}
	}
}
