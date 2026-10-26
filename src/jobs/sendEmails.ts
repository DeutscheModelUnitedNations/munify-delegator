import { z } from 'zod';
import { sendEmailsConfig } from './config';

const resultSchema = z.object({ sent: z.number(), failed: z.number(), remaining: z.number() });

/** Calls the app at most this often in one run, so a stuck sweep cannot keep the job alive. */
const MAX_ROUNDS = 50;

/** Whether asking again would be pointless: nothing is left, or the last round got nowhere. */
function finished({ sent, failed, remaining }: z.infer<typeof resultSchema>) {
	return remaining === 0 || sent + failed === 0;
}

/**
 * Asks the app to send the automatic mails that are due (`/api/jobs/send-emails`). The app renders
 * and sends them - the templates and translations live there - and answers how many are left; the
 * job asks again until none are. Every few minutes: the reminders are sent from here.
 */
export async function runSendEmails() {
	const { APP_URL, JOBS_SECRET } = sendEmailsConfig();
	const endpoint = new URL('/api/jobs/send-emails', APP_URL);
	for (let round = 1; round <= MAX_ROUNDS; round++) {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'x-jobs-secret': JOBS_SECRET }
		});
		if (!response.ok) {
			throw new Error(`send-emails: the app answered ${response.status} ${await response.text()}`);
		}
		const { sent, failed, remaining } = resultSchema.parse(await response.json());
		console.info(`send-emails round ${round}: ${sent} sent, ${failed} failed, ${remaining} left`);
		if (finished({ sent, failed, remaining })) return;
	}
}
