import { client } from '$lib/api/rumbleClient/client';
import type { LayoutLoad } from './$types';

/** Every conference the caller takes part in, in any role. */
export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();

	return {
		myConferences: await client.query.conferences({
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
		})
	};
};
