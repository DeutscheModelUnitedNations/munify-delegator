import { client } from '$lib/api/rumbleClient/client';
import { getRegistrationStatus } from '$lib/utils/registrationStatus';
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

/**
 * Guards the registration flow: it only exists while registration is actually open - except for
 * supervisors, who may register at any point before the conference is over. Only sending an
 * application depends on the stage, and supervisors never send one.
 */
export const load: LayoutLoad = async (event) => {
	const conference = await client.query.conference({
		__args: { id: event.params.conferenceId },
		state: true,
		startAssignment: true
	});

	if (!conference) {
		redirect(307, '/registration');
	}

	if (event.url.pathname.endsWith('/supervisor') && conference.state !== 'POST') {
		return;
	}

	switch (getRegistrationStatus(conference.state, new Date(conference.startAssignment))) {
		case 'CLOSED':
		case 'NOT_YET_OPEN':
		case 'UNKNOWN':
			redirect(307, '/registration');
			break;
		case 'WAITING_LIST':
			if (!event.url.pathname.endsWith('waiting-list')) {
				redirect(307, `/registration/${event.params.conferenceId}/waiting-list`);
			}
	}
};
