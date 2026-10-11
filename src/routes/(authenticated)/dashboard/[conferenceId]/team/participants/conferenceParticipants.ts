import { client } from '$lib/api/rumbleClient/client';

/** The columns every participant table row needs, whatever the registration type. */
const participantUser = {
	id: true,
	givenName: true,
	familyName: true,
	email: true,
	phone: true,
	birthday: true,
	gender: true,
	pronouns: true,
	foodPreference: true,
	city: true,
	country: true,
	conferenceParticipationsCount: true
} as const;

/**
 * Every registration of a conference, whatever its type, for the participants table.
 *
 * One list query per registration type for the people of one page (`userIds`), holding only what
 * the table's columns show and export. Everything else about a person is fetched by the user card when a row is opened.
 */
export async function fetchConferenceParticipants(conferenceId: string, userIds: string[]) {
	const inConference = {
		where: { conferenceId: { eq: conferenceId }, userId: { in: userIds } }
	};

	const [
		conference,
		delegationMembers,
		conferenceSupervisors,
		singleParticipants,
		teamMembers,
		participantStatuses
	] = await Promise.all([
		client.liveQuery.conference({
			__args: { id: conferenceId },
			state: true,
			startConference: true,
			endConference: true
		}),
		client.liveQuery.delegationMembers({
			__args: inConference,
			isHeadDelegate: true,
			assignedCommittee: { name: true },
			delegation: {
				school: true,
				assignedNation: { alpha2Code: true, alpha3Code: true },
				assignedNonStateActor: { name: true, fontAwesomeIcon: true }
			},
			user: participantUser
		}),
		client.liveQuery.conferenceSupervisors({
			__args: inConference,
			plansOwnAttendenceAtConference: true,
			supervisedDelegationMembers: {
				delegation: {
					assignedNation: { alpha3Code: true },
					assignedNonStateActor: { id: true }
				}
			},
			supervisedSingleParticipants: { assignedRole: { id: true } },
			user: participantUser
		}),
		client.liveQuery.singleParticipants({
			__args: inConference,
			applied: true,
			school: true,
			assignedRole: { name: true, fontAwesomeIcon: true },
			user: participantUser
		}),
		client.liveQuery.teamMembers({ __args: inConference, role: true, user: participantUser }),
		client.liveQuery.conferenceParticipantStatuses({
			__args: {
				// Only the statuses of the people on this page, who are registered here and are the
				// rows the table joins them onto.
				where: { conferenceId: { eq: conferenceId }, userId: { in: userIds } }
			},
			user: { id: true },
			paymentStatus: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			didAttend: true,
			assignedDocumentNumber: true,
			accessCardId: true
		})
	]);

	return {
		conference,
		delegationMembers,
		conferenceSupervisors,
		singleParticipants,
		teamMembers,
		participantStatuses
	};
}

export type ConferenceParticipants = Awaited<ReturnType<typeof fetchConferenceParticipants>>;
