import { client } from '$lib/api/rumbleClient/client';
import { fetchCurrentUser } from '$lib/api/currentUser';

/** Fields every conference card in the management area needs. */
const conferenceSelection = {
	id: true,
	title: true,
	startConference: true,
	endConference: true
} as const;

const PRIVILEGED_ROLES = ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] as const;

/**
 * The conferences the caller may manage, and in what capacity.
 *
 * Admins see every conference; everyone else only those where they hold a privileged role.
 *
 * A plain query, not a `liveQuery`: it is what the area's guards ask, so it has to be right rather
 * than reactive - and rumble cannot build a subscription document for the nested `teamMembers`
 * filter the non-admin branch needs ("Expected an INPUT_OBJECT hit in named based lookup").
 */
export async function fetchMyManagedConferences() {
	const user = await fetchCurrentUser();

	if (user.isAdmin) {
		const conferences = await client.query.conferences({
			__args: { orderBy: { startConference: 'desc' } },
			...conferenceSelection
		});

		return conferences.map((conference) => ({ ...conference, myMembership: 'SYSTEM_ADMIN' }));
	}

	const conferences = await client.query.conferences({
		__args: {
			where: {
				// `role` is a plain enum in the API's filter, not a where-input, so "one of these"
				// has to be spelled as alternatives rather than `{ in: [...] }`. Each alternative
				// repeats the user, because a sibling of `OR` does not constrain its branches.
				teamMembers: {
					OR: PRIVILEGED_ROLES.map((role) => ({ role, userId: { eq: user.sub } }))
				}
			},
			orderBy: { startConference: 'desc' }
		},
		...conferenceSelection,
		teamMembers: { id: true, role: true, user: { id: true } }
	});

	return conferences.map((conference) => ({
		...conference,
		myMembership: conference.teamMembers.find((member) => member.user?.id === user.sub)?.role
	}));
}
