import { client } from '#lib/api/rumbleClient/client.js';
import { getRegistrationStatus } from '#lib/utils/registrationStatus.js';
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { registrationRedirect } from './registrationGuard';

/**
 * Guards the registration flow: it only exists while registration is actually open - except for
 * supervisors, who may register at any point before the conference is over. Only sending an
 * application depends on the stage, and supervisors never send one.
 */
export const load: LayoutLoad = async (event) => {
	// A supervisor's link has to work for someone who cannot read the conference yet (it only
	// shows to people who have a part in it once registration is over); the mutation checks the rest.
	if (event.url.pathname.endsWith('/supervisor')) {
		return;
	}

	const conference = await client.query.conference({
		__args: { id: event.params.conferenceId },
		state: true,
		startAssignment: true
	});

	const { conferenceId } = event.params;
	const target = conference
		? registrationRedirect(
				getRegistrationStatus(conference.state, new Date(conference.startAssignment)),
				event.url.pathname,
				conferenceId
			)
		: `/dashboard/${conferenceId}`;
	if (target) redirect(307, target);
};
