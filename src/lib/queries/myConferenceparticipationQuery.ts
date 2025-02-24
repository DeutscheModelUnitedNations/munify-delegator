import { graphql } from '$houdini';

export const myConferenceparticipationQuery = graphql(`
	query MyConferenceparticipationQuery($userId: String!, $conferenceId: String!) {
		findUniqueUser(where: { id: $userId }) {
			birthday
		}
		findUniqueConferenceParticipantStatus(
			where: { userId_conferenceId: { userId: $userId, conferenceId: $conferenceId } }
		) {
			id
			paymentStatus
			termsAndConditions
			guardianConsent
			mediaConsent
			didAttend
		}
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
			info
			linkToPreparationGuide
			state
			startConference
			startAssignment
			endConference
			unlockPayments
			unlockPostals
			postalName
			postalStreet
			postalApartment
			postalZip
			postalCity
			postalCountry
			committees {
				id
				abbreviation
				name
				nations {
					alpha3Code
					alpha2Code
				}
				numOfSeatsPerDelegation
			}
			nonStateActors {
				id
				name
				seatAmount
				description
			}
		}

		findUniqueDelegationMember(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			isHeadDelegate
			assignedCommittee {
				id
				abbreviation
				name
			}
			delegation {
				id
				entryCode
				school
				experience
				motivation
				applied
				members {
					id
					isHeadDelegate
					user {
						id
						pronouns
						family_name
						given_name
						email
						birthday
						conferenceParticipantStatus {
							id
							conference {
								id
							}
							paymentStatus
							termsAndConditions
							guardianConsent
							mediaConsent
						}
					}
					assignedCommittee {
						id
						abbreviation
						name
					}
				}
				assignedNation {
					alpha3Code
					alpha2Code
				}
				assignedNonStateActor {
					id
					abbreviation
					name
					description
					fontAwesomeIcon
					seatAmount
				}
				appliedForRoles {
					id
					rank
					nonStateActor {
						id
						fontAwesomeIcon
						name
						seatAmount
						description
					}
					nation {
						alpha3Code
						alpha2Code
					}
				}
				supervisors {
					id
					user {
						given_name
						family_name
						pronouns
						email
					}
				}
			}
		}
		findUniqueConferenceSupervisor(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			plansOwnAttendenceAtConference
			delegations {
				id
				applied
				entryCode
				school
				motivation
				experience
				assignedNation {
					alpha3Code
					alpha2Code
				}
				assignedNonStateActor {
					id
					abbreviation
					name
					description
					fontAwesomeIcon
					seatAmount
				}
				appliedForRoles {
					id
					rank
					nonStateActor {
						id
						name
					}
					nation {
						alpha3Code
						alpha2Code
					}
				}
				supervisors {
					id
					user {
						id
						given_name
						family_name
						email
					}
				}
				members {
					id
					isHeadDelegate
					assignedCommittee {
						id
						abbreviation
						name
					}
					user {
						id
						given_name
						family_name
						pronouns
						birthday
						conferenceParticipantStatus {
							id
							conference {
								id
							}
							paymentStatus
							termsAndConditions
							guardianConsent
							mediaConsent
						}
					}
				}
			}
		}
		findUniqueSingleParticipant(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			school
			motivation
			experience
			applied
			appliedForRoles {
				id
				name
				description
				fontAwesomeIcon
			}
			assignedRole {
				id
				name
				description
				fontAwesomeIcon
			}
			user {
				id
				given_name
				family_name
				pronouns
			}
		}
		findManySurveyQuestions(
			where: { conferenceId: { equals: $conferenceId }, draft: { equals: false } }
		) {
			id
			title
			description
			deadline
		}
		findManySurveyAnswers(where: { userId: { equals: $userId } }) {
			id
			question {
				id
			}
		}
	}
`);
