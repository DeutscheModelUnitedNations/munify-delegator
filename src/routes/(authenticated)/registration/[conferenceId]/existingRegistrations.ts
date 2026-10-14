import { client } from '$lib/api/rumbleClient/client';

/** Which of the three registration paths the caller has already taken for this conference. */
export async function fetchExistingRegistrations(conferenceId: string, userId: string) {
	const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: userId } };

	const [supervisors, delegationMembers, singleParticipants] = await Promise.all([
		client.liveQuery.conferenceSupervisors({ __args: { where: forUser }, id: true }),
		client.liveQuery.delegationMembers({ __args: { where: forUser }, id: true }),
		client.liveQuery.singleParticipants({ __args: { where: forUser }, id: true })
	]);

	return { supervisors, delegationMembers, singleParticipants };
}
