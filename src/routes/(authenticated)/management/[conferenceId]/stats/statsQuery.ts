import { graphql } from '$houdini';

export const statsQuery = graphql(`
	query ConferenceStatsQuery($conferenceID: ID!, $filter: StatsFilter!) {
		getConferenceStatistics(conferenceId: $conferenceID, filter: $filter) {
			addresses {
				country
				zip
				_count {
					zip
					country
					_all
				}
			}
			age {
				overall {
					average
					total
					missingBirthdays
				}
				distribution {
					age
					count
					byCategory {
						categoryId
						count
					}
				}
				byCategory {
					categoryId
					categoryName
					categoryType
					count
					average
				}
				byCommittee {
					committeeId
					committeeName
					abbreviation
					count
					average
				}
			}
			diet {
				delegationMembers {
					omnivore
					vegan
					vegetarian
				}
				singleParticipants {
					omnivore
					vegan
					vegetarian
				}
				supervisors {
					omnivore
					vegetarian
					vegan
				}
				teamMembers {
					omnivore
					vegan
					vegetarian
				}
			}
			gender {
				delegationMembers {
					diverse
					female
					male
					noStatement
				}
				singleParticipants {
					diverse
					female
					male
					noStatement
				}
				supervisors {
					male
					female
					diverse
					noStatement
				}
				teamMembers {
					diverse
					female
					male
					noStatement
				}
			}
			countdowns {
				daysUntilConference
				daysUntilEndRegistration
			}
			registered {
				applied
				delegationMembers {
					applied
					notApplied
					total
				}
				delegations {
					applied
					notApplied
					total
				}
				notApplied
				singleParticipants {
					applied
					byRole {
						applied
						fontAwesomeIcon
						notApplied
						role
						total
					}
					notApplied
					total
				}
				supervisors
				total
			}
			status {
				postalStatus {
					done
					problem
				}
				paymentStatus {
					done
					problem
				}
				didAttend
			}
			roleBased {
				delegationMembersWithRole
				delegationMembersWithoutRole
				delegationMembersWithCommittee
				delegationMembersWithoutCommittee
				singleParticipantsWithRole
				singleParticipantsWithoutRole
				delegationsWithAssignment
				delegationsWithoutAssignment
			}
			committeeFillRates {
				committeeId
				name
				abbreviation
				totalSeats
				assignedSeats
				fillPercentage
			}
			registrationTimeline {
				date
				cumulativeDelegations
				cumulativeDelegationMembers
				cumulativeSingleParticipants
				cumulativeSupervisors
			}
			nationalityDistribution {
				country
				countryCode
				count
			}
			schoolStats {
				school
				delegationCount
				memberCount
			}
			waitingList {
				total
				visible
				hidden
				assigned
				unassigned
			}
			supervisorStats {
				total
				accepted
				rejected
				plansAttendance
				doesNotPlanAttendance
				acceptedAndPresent
				acceptedAndNotPresent
				rejectedAndPresent
				rejectedAndNotPresent
			}
			postalPaymentProgress {
				maxParticipants
				postalDone
				postalPending
				postalProblem
				postalPercentage
				paymentDone
				paymentPending
				paymentProblem
				paymentPercentage
				bothComplete
				postalOnlyComplete
				paymentOnlyComplete
				neitherComplete
			}
			paperStats {
				total
				byType {
					positionPaper
					workingPaper
					introductionPaper
				}
				byStatus {
					draft
					submitted
					changesRequested
					accepted
				}
				withReviews
				withoutReviews
				byCommittee {
					committeeId
					name
					abbreviation
					count
				}
			}
		}
	}
`);
