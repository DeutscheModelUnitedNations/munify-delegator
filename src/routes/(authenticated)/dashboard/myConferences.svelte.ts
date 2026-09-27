import { client } from '$lib/api/rumbleClient/client';
import { getCurrentUser } from '$lib/state/currentUser.svelte';

/** Every conference the caller takes part in, in any role — the dashboard's navigation. */
export async function fetchMyConferences() {
	const user = await getCurrentUser();

	return client.liveQuery.conferences({
		__args: {
			where: {
				OR: [
					{ conferenceSupervisors: { userId: { eq: user.sub } } },
					{ delegationMembers: { userId: { eq: user.sub } } },
					{ singleParticipants: { userId: { eq: user.sub } } },
					{ teamMembers: { userId: { eq: user.sub } } }
				]
			}
		},
		id: true,
		title: true,
		startConference: true,
		endConference: true,
		startAssignment: true,
		state: true
	});
}
