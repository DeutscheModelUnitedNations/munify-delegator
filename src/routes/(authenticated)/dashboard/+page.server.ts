import { redirect } from '@sveltejs/kit';
import { client } from '$lib/api/rumbleClient/client';
import type { PageServerLoad } from './$types';

/**
 * The conference picker. Someone taking part in exactly one conference is sent straight to it,
 * so this list only ever renders for people involved in several.
 */
export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const forUser = { where: { userId: { eq: user.sub } } };

	const [conferences, delegationMembers, singleParticipants, supervisors, teamMembers] =
		await Promise.all([
			client.query.conferences({
				__args: {
					where: {
						OR: [
							{ conferenceSupervisors: { userId: { eq: user.sub } } },
							{ delegationMembers: { userId: { eq: user.sub } } },
							{ singleParticipants: { userId: { eq: user.sub } } },
							{ teamMembers: { userId: { eq: user.sub } } }
						]
					},
					orderBy: { startConference: 'desc' }
				},
				id: true,
				title: true,
				location: true,
				website: true,
				longTitle: true,
				language: true,
				imageDataURL: true,
				state: true,
				startAssignment: true,
				startConference: true,
				endConference: true
			}),
			client.query.delegationMembers({
				__args: forUser,
				id: true,
				isHeadDelegate: true,
				conference: { id: true },
				assignedCommittee: { id: true, abbreviation: true, name: true },
				delegation: {
					id: true,
					applied: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: { id: true, name: true, fontAwesomeIcon: true }
				}
			}),
			client.query.singleParticipants({
				__args: forUser,
				id: true,
				conference: { id: true },
				applied: true,
				assignedRole: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.query.conferenceSupervisors({
				__args: forUser,
				id: true,
				conference: { id: true },
				supervisedDelegationMembers: {
					id: true,
					delegation: {
						assignedNation: { alpha2Code: true },
						assignedNonStateActor: { id: true }
					}
				},
				supervisedSingleParticipants: { id: true, assignedRole: { id: true } }
			}),
			client.query.teamMembers({ __args: forUser, id: true, conference: { id: true }, role: true })
		]);

	if (conferences.length === 1) {
		redirect(303, `/dashboard/${conferences[0].id}`);
	}

	return {
		conferences: conferences.map((conference) => ({
			...conference,
			delegationMembers: delegationMembers.filter((row) => row.conference.id === conference.id),
			singleParticipants: singleParticipants.filter((row) => row.conference.id === conference.id),
			conferenceSupervisors: supervisors.filter((row) => row.conference.id === conference.id),
			teamMembers: teamMembers.filter((row) => row.conference.id === conference.id)
		}))
	};
};
