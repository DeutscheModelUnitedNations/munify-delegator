import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const user = locals.user;
	if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	const body = await request.json();
	const { recipientId, subject, body: messageBody } = body;
	if (!recipientId || !subject || !messageBody)
		return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });

	// TODO: Rate limiting, opt-in check, MessageAudit insertion, email send

	return new Response(JSON.stringify({ status: 'ok' }), {
		headers: { 'content-type': 'application/json' }
	});
};
