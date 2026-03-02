import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query AllConferenceParticipantsQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			startConference
			endConference
		}
		findManyDelegationMembers(where: { conferenceId: { equals: $conferenceId } }) {
			isHeadDelegate
			assignedCommittee {
				name
				abbreviation
			}
			delegation {
				school
				entryCode
				assignedNation {
					alpha2Code
					alpha3Code
				}
				assignedNonStateActor {
					name
					abbreviation
					fontAwesomeIcon
				}
			}
			user {
				id
				given_name
				family_name
				email
				phone
				birthday
				gender
				pronouns
				foodPreference
				city
				country
				conferenceParticipationsCount
			}
		}
		findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
			plansOwnAttendenceAtConference
			supervisedDelegationMembers {
				delegation {
					assignedNation {
						alpha3Code
					}
					assignedNonStateActor {
						id
					}
				}
			}
			supervisedSingleParticipants {
				assignedRole {
					id
				}
			}
			user {
				id
				given_name
				family_name
				email
				phone
				birthday
				gender
				pronouns
				foodPreference
				city
				country
				conferenceParticipationsCount
			}
		}
		findManySingleParticipants(where: { conferenceId: { equals: $conferenceId } }) {
			applied
			school
			assignedRole {
				name
				fontAwesomeIcon
			}
			user {
				id
				given_name
				family_name
				email
				phone
				birthday
				gender
				pronouns
				foodPreference
				city
				country
				conferenceParticipationsCount
			}
		}
		findManyTeamMembers(where: { conferenceId: { equals: $conferenceId } }) {
			role
			user {
				id
				given_name
				family_name
				email
				phone
				birthday
				gender
				pronouns
				foodPreference
				city
				country
				conferenceParticipationsCount
			}
		}
		findManyConferenceParticipantStatuss(where: { conferenceId: { equals: $conferenceId } }) {
			user {
				id
			}
			paymentStatus
			termsAndConditions
			guardianConsent
			mediaConsent
			mediaConsentStatus
			didAttend
			assignedDocumentNumber
			accessCardId
		}
	}
`);

export const _AllConferenceParticipantsQueryVariables = (event: {
	params: { conferenceId: string };
}) => {
	return { conferenceId: event.params.conferenceId };
};
