import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	// TODO: Query MessageAudit where senderId = locals.user.id and conferenceId
	const items = [
		{
			recipientLabel: 'Germany',
			subject: 'Merging working paper',
			sentAt: '2026-01-12T10:00:00Z',
			status: 'Sent'
		},
		{
			recipientLabel: 'ICJ Judge',
			subject: 'Question about draft',
			sentAt: '2026-01-11T09:00:00Z',
			status: 'Sent'
		}
	];
	return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
};
