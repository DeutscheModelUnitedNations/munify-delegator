import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

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

export const load: PageLoad = async (event) => {
	const conferenceId = event.params.conferenceId;
	const inConference = { where: { conferenceId: { eq: conferenceId } } };

	const [
		conference,
		delegationMembers,
		conferenceSupervisors,
		singleParticipants,
		teamMembers,
		participantStatuses
	] = await Promise.all([
		client.query.conference({
			__args: { id: conferenceId },
			state: true,
			startConference: true,
			endConference: true
		}),
		client.query.delegationMembers({
			__args: inConference,
			isHeadDelegate: true,
			assignedCommittee: { name: true, abbreviation: true },
			delegation: {
				school: true,
				entryCode: true,
				assignedNation: { alpha2Code: true, alpha3Code: true },
				assignedNonStateActor: {
					name: true,
					abbreviation: true,
					fontAwesomeIcon: true
				}
			},
			user: participantUser
		}),
		client.query.conferenceSupervisors({
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
		client.query.singleParticipants({
			__args: inConference,
			applied: true,
			school: true,
			assignedRole: { name: true, fontAwesomeIcon: true },
			user: participantUser
		}),
		client.query.teamMembers({ __args: inConference, role: true, user: participantUser }),
		client.query.conferenceParticipantStatuses({
			__args: inConference,
			user: { id: true },
			paymentStatus: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			mediaConsentStatus: true,
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
};
