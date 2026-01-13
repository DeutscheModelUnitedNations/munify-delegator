import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const conferenceId = event.params.conferenceId;
	const user = event.locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await event.request.json();
	const { recipientId, subject, body: messageBody } = body;
	if (!recipientId || !subject || !messageBody) {
		return json({ error: 'Missing fields' }, { status: 400 });
	}

	// TODO: Rate limit check via MessageAudit counts
	// TODO: Verify recipient opt-in and eligibility
	// TODO: Insert MessageAudit record and trigger transactional email

	return json({ status: 'ok' });
}
