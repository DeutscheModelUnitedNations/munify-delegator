import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ConferenceParticipantsByParticipationTypeQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			endConference
			startConference
			nextDocumentNumber
		}
		findManyDelegationMembers(where: { conferenceId: { equals: $conferenceId } }) {
			user {
				id
				given_name
				family_name
				city
				birthday
				email
				conferenceParticipationsCount
			}
		}
		findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
			user {
				id
				given_name
				family_name
				city
				birthday
				email
				conferenceParticipationsCount
			}
		}
		findManySingleParticipants(where: { conferenceId: { equals: $conferenceId } }) {
			user {
				id
				given_name
				family_name
				city
				birthday
				email
			}
		}
		findManyConferenceParticipantStatuss(where: { conferenceId: { equals: $conferenceId } }) {
			id
			user {
				id
				email
				conferenceParticipationsCount
			}
			paymentStatus
			termsAndConditions
			guardianConsent
			mediaConsent
			didAttend
		}
	}
`);

export const _ConferenceParticipantsByParticipationTypeQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
