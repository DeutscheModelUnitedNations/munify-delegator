import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { JOBS_SECRET } from '$app/env/private';
import { conferencesSendingEmails, sendDueEmails } from '$api/handlers/email/emailSweep';
import type { RequestHandler } from './$types';

/** How many mails one call sends at most; the job calls again while some remain. */
const BATCH = 300;

/**
 * The secret comes in its own header: the OIDC hook takes any `Authorization: Bearer` for a login
 * token and refuses the request before it gets here.
 */
function authorized(header: string | null) {
	if (!JOBS_SECRET || !header) return false;
	const given = Buffer.from(header);
	const expected = Buffer.from(JOBS_SECRET);
	return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Sends the automatic mails that are due in every conference that sends any - the time-based
 * reminders, and whatever a mutation's own sweep did not get to. Called by the `send-emails` job
 * with `JOBS_SECRET`; the links in the mails point at the origin it calls.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	if (!JOBS_SECRET) error(503, 'JOBS_SECRET is not configured');
	if (!authorized(request.headers.get('x-jobs-secret'))) error(401, 'Unauthorized');

	let budget = BATCH;
	const totals = { sent: 0, failed: 0, remaining: 0 };
	for (const conferenceId of await conferencesSendingEmails()) {
		if (budget <= 0) {
			totals.remaining++;
			continue;
		}
		const result = await sendDueEmails({ conferenceId, origin: url.origin, limit: budget });
		budget -= result.sent + result.failed;
		totals.sent += result.sent;
		totals.failed += result.failed;
		totals.remaining += result.remaining;
	}
	return Response.json(totals);
};
