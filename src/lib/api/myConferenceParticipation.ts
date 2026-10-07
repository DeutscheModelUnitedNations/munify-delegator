import { client } from './rumbleClient/client';
import { getCurrentUser } from '$lib/state/currentUser.svelte';

/**
 * Who the caller is in one conference: which role they hold, and just enough about it to decide
 * what to render.
 *
 * This is deliberately small. It is the one query every dashboard page shares, so anything a
 * single section shows (a delegation's members, a supervisor's students, the conference's postal
 * address) is fetched by the component that shows it, keyed by the ids returned here.
 *
 * A person can only be one of delegation member, single participant or supervisor, but which one
 * is not known until it is looked up, so all lookups run in parallel and the caller picks the one
 * that came back.
 */
export async function fetchMyConferenceParticipation({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: userId } };

	const [
		user,
		participantStatuses,
		conference,
		delegationMembers,
		supervisors,
		singleParticipants,
		teamMembers
	] = await Promise.all([
		client.liveQuery.user({ __args: { id: userId }, id: true, birthday: true }),
		client.liveQuery.conferenceParticipantStatuses({
			__args: { where: forUser },
			id: true,
			paymentStatus: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			didAttend: true
		}),
		client.liveQuery.conference({
			__args: { id: conferenceId },
			id: true,
			title: true,
			state: true,
			startConference: true
		}),
		client.liveQuery.delegationMembers({
			__args: { where: forUser },
			id: true,
			isHeadDelegate: true,
			assignedCommittee: { id: true, abbreviation: true, name: true },
			delegation: {
				id: true,
				applied: true,
				assignedNation: { alpha3Code: true, alpha2Code: true },
				assignedNonStateActor: {
					id: true,
					abbreviation: true,
					name: true,
					description: true,
					fontAwesomeIcon: true,
					seatAmount: true
				}
			}
		}),
		client.liveQuery.conferenceSupervisors({
			__args: { where: forUser },
			id: true,
			plansOwnAttendenceAtConference: true
		}),
		client.liveQuery.singleParticipants({
			__args: { where: forUser },
			id: true,
			applied: true,
			assignedRole: { id: true, name: true, description: true, fontAwesomeIcon: true }
		}),
		client.liveQuery.teamMembers({ __args: { where: forUser }, id: true, role: true })
	]);

	// The lists are live proxies: reading through them is what subscribes a component to the
	// updates mutations publish. Taking `.at(0)` once, up front, would hand out the first row as it
	// was on load and freeze it there, so the single rows are getters that read the list each time.
	return {
		user,
		conference,
		get participantStatus() {
			return participantStatuses.at(0) ?? null;
		},
		get delegationMember() {
			return delegationMembers.at(0) ?? null;
		},
		get supervisor() {
			return supervisors.at(0) ?? null;
		},
		get singleParticipant() {
			return singleParticipants.at(0) ?? null;
		},
		get teamMember() {
			return teamMembers.at(0) ?? null;
		}
	};
}

export type MyConferenceParticipation = Awaited<ReturnType<typeof fetchMyConferenceParticipation>>;

/**
 * The caller's own participation, which is what every dashboard page wants.
 *
 * Await it in a `$derived` so the page follows both the conference in the URL and the live updates
 * the mutations publish.
 */
export async function fetchMyParticipation(conferenceId: string) {
	// Rumble's client serializes an `undefined` argument as `null` rather than omitting it, which a
	// non-nullable `ID!` argument then rejects - so skip the request rather than fire one that can
	// only fail.
	if (!conferenceId) return undefined;

	const user = await getCurrentUser();
	return fetchMyConferenceParticipation({ userId: user.sub, conferenceId });
}
