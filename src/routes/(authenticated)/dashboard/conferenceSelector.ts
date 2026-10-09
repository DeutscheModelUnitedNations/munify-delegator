import { client } from '$lib/api/rumbleClient/client';

/**
 * Every conference the selector offers. The API's read rules narrow it to the conferences the
 * caller is a member of plus those currently open for registration.
 */
export function fetchSelectableConferences() {
	return client.liveQuery.conferences({
		__args: { orderBy: { startConference: 'asc' } },
		id: true,
		title: true,
		state: true,
		startConference: true
	});
}

/**
 * The ids of the conferences the user has a part in: applied to, supervises at, is on the team of
 * or took part in. Read through the user's own rows, so it does not depend on what is visible.
 */
export async function fetchMyConferenceIds(userId: string) {
	const where = { userId: { eq: userId } };
	const selection = { conferenceId: true } as const;
	const [delegationMembers, singleParticipants, supervisors, teamMembers] = await Promise.all([
		client.liveQuery.delegationMembers({ __args: { where }, ...selection }),
		client.liveQuery.singleParticipants({ __args: { where }, ...selection }),
		client.liveQuery.conferenceSupervisors({ __args: { where }, ...selection }),
		client.liveQuery.teamMembers({ __args: { where }, ...selection })
	]);
	return new Set(
		[delegationMembers, singleParticipants, supervisors, teamMembers].flatMap((rows) =>
			rows.slice().map((row) => row.conferenceId)
		)
	);
}
