import { client } from '#lib/api/rumbleClient/client';
import type { ParticipationInput } from './myConferenceCardParticipation';

/**
 * The caller's parts in every conference at once: applied to, supervises at, is on the team of or
 * took part in, with what a conference card shows of them. Read through the user's own rows, so it
 * does not depend on what is visible.
 *
 * One fetch for the whole selector rather than `fetchMyParticipation` per card, which ran seven
 * queries for each one. The page and every card ask with the same arguments, so they share the
 * result: SvelteKit's remote cache during SSR, urql's in the browser.
 */
export async function fetchMyParticipations(userId: string) {
	// Through the participant row's column, not the `user` relation: a filter on a relation is
	// checked against that table's read rules, and the user table's are costly to resolve.
	const byUser = { participant: { userId: { eq: userId } } };
	const [delegationMembers, singleParticipants, supervisors, teamMembers] = await Promise.all([
		client.liveQuery.delegationMembers({
			__args: { where: byUser },
			conference: { id: true },
			isHeadDelegate: true,
			assignedCommittee: { abbreviation: true, name: true },
			delegation: {
				applied: true,
				assignedRole: {
					kind: true,
					name: true,
					icon: true,
					nation: { alpha3Code: true, alpha2Code: true }
				}
			}
		}),
		client.liveQuery.singleParticipants({
			__args: { where: byUser },
			conference: { id: true },
			applied: true,
			assignedRole: { name: true, icon: true }
		}),
		client.liveQuery.conferenceSupervisors({
			__args: { where: byUser },
			conference: { id: true }
		}),
		client.liveQuery.teamMembers({
			__args: { where: { userId: { eq: userId } } },
			conferenceId: true,
			role: true
		})
	]);

	// The lists are live proxies: these read them on every call, so callers follow the updates.
	return {
		/** The ids of the conferences the user has any part in. */
		get conferenceIds() {
			return new Set([
				...[delegationMembers, singleParticipants, supervisors].flatMap((rows) =>
					rows.slice().map((row) => row.conference.id)
				),
				...teamMembers.slice().map((row) => row.conferenceId)
			]);
		},
		/** The user's part in one conference, as the conference card reads it. */
		in(conferenceId: string): ParticipationInput & { supervisor: object | null } {
			const inConference = (row: { conference: { id: string } }) =>
				row.conference.id === conferenceId;
			return {
				teamMember: teamMembers.slice().find((row) => row.conferenceId === conferenceId) ?? null,
				delegationMember: delegationMembers.slice().find(inConference) ?? null,
				singleParticipant: singleParticipants.slice().find(inConference) ?? null,
				supervisor: supervisors.slice().find(inConference) ?? null
			};
		}
	};
}
