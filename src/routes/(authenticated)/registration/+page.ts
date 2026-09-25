import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

/** Conferences still to come, plus the ones the caller is already signed up for. */
export const load: PageLoad = async (event) => {
	const { user } = await event.parent();
	const forUser = { where: { userId: { eq: user.sub } } };

	const [conferences, delegationMembers, singleParticipants, conferenceSupervisors] =
		await Promise.all([
			client.query.conferences({
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
			client.query.delegationMembers({ __args: forUser, conference: { id: true } }),
			client.query.singleParticipants({ __args: forUser, conference: { id: true } }),
			client.query.conferenceSupervisors({ __args: forUser, conference: { id: true } })
		]);

	return { conferences, delegationMembers, singleParticipants, conferenceSupervisors };
};
