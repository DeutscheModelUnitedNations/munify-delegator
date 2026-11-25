import { client } from '#lib/api/rumbleClient/client';

const supervisorSelection = {
	id: true,
	user: { id: true, givenName: true, familyName: true }
} as const;

/** Supervisors reach a participant through either kind of registration, so both are asked. */
export async function fetchSupervisors({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const forUser = {
		where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: userId } } }
	};
	const [student, delegationMembers, singleParticipants] = await Promise.all([
		client.liveQuery.user({
			__args: { id: userId },
			id: true,
			givenName: true,
			familyName: true
		}),
		client.liveQuery.delegationMembers({
			__args: forUser,
			id: true,
			supervisors: supervisorSelection
		}),
		client.liveQuery.singleParticipants({
			__args: forUser,
			id: true,
			supervisors: supervisorSelection
		})
	]);
	return { student, delegationMembers, singleParticipants };
}
