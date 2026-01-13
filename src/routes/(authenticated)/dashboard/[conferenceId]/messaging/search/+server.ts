import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	// TODO: Query DB for active DelegationMember and SingleParticipant in conference with opt-in
	// For now return placeholder
	const conferenceId = params.conferenceId;
	const items = [
		{ id: 'dm-1', label: 'Germany' },
		{ id: 'dm-2', label: 'Amnesty International (J.D.)' },
		{ id: 'sp-1', label: 'ICJ Judge' }
	];
	return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
};
