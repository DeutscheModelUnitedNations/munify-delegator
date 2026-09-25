import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

/** Which of the three registration paths the caller has already taken, if any. */
export const load: PageLoad = async (event) => {
	const { user } = await event.parent();
	const forUser = {
		conferenceId: { eq: event.params.conferenceId },
		userId: { eq: user.sub }
	};

	const [supervisors, delegationMembers, singleParticipants] = await Promise.all([
		client.query.conferenceSupervisors({ __args: { where: forUser }, id: true }),
		client.query.delegationMembers({ __args: { where: forUser }, id: true }),
		client.query.singleParticipants({ __args: { where: forUser }, id: true })
	]);

	return { supervisors, delegationMembers, singleParticipants };
};
