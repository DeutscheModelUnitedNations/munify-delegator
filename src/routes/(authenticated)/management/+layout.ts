import { client } from '$lib/api/rumbleClient/client';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';

/** Fields every conference card in the management area needs. */
const conferenceSelection = {
	id: true,
	title: true,
	startConference: true,
	endConference: true
} as const;

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();

	// Admins see every conference; everyone else only those where they hold a privileged role.
	if (user.myOIDCRoles.includes('admin')) {
		const conferences = await client.query.conferences({
			__args: { orderBy: { startConference: 'desc' } },
			...conferenceSelection
		});

		return {
			conferences: conferences.map((conference) => ({
				...conference,
				myMembership: 'SYSTEM_ADMIN'
			}))
		};
	}

	const conferences = await client.query.conferences({
		__args: {
			where: {
				teamMembers: {
					role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] },
					userId: { eq: user.sub }
				}
			},
			orderBy: { startConference: 'desc' }
		},
		...conferenceSelection,
		teamMembers: {
			id: true,
			role: true,
			user: { id: true }
		}
	});

	if (conferences.length === 0) {
		error(403, m.noAccess());
	}

	return {
		conferences: conferences.map((conference) => ({
			...conference,
			myMembership: conference.teamMembers.find((member) => member.user?.id === user.sub)?.role
		}))
	};
};
