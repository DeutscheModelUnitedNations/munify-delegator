import { client } from '$lib/api/rumbleClient/client';

/** Conferences still to come, plus the ones the caller is already signed up for. */
export async function fetchOpenConferences(userId: string) {
	const forUser = { where: { userId: { eq: userId } } };

	const [conferences, delegationMembers, singleParticipants, conferenceSupervisors] =
		await Promise.all([
			client.liveQuery.conferences({
				__args: {
					orderBy: { startConference: 'asc' },
					where: { startConference: { gt: new Date() } }
				},
				id: true,
				location: true,
				longTitle: true,
				startAssignment: true,
				startConference: true,
				state: true,
				title: true,
				website: true,
				endConference: true,
				imageDataURL: true,
				language: true,
				totalSeats: true,
				totalParticipants: true,
				waitingListLength: true
			}),
			client.liveQuery.delegationMembers({ __args: forUser, conference: { id: true } }),
			client.liveQuery.singleParticipants({ __args: forUser, conference: { id: true } }),
			client.liveQuery.conferenceSupervisors({ __args: forUser, conference: { id: true } })
		]);

	return { conferences, delegationMembers, singleParticipants, conferenceSupervisors };
}
