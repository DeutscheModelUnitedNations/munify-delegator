import { client } from '$lib/api/rumbleClient/client';
import type { StatsFilter } from '$lib/api/rumbleClient/client';

/** The whole statistics dashboard in one request. */
export function fetchConferenceStatistics(conferenceId: string, filter: StatsFilter) {
	return client.liveQuery.getConferenceStatistics({
		__args: { conferenceId, filter },
		addresses: {
			country: true,
			zip: true,
			_count: {
				zip: true,
				country: true,
				_all: true
			}
		},
		age: {
			overall: {
				average: true,
				total: true,
				missingBirthdays: true
			},
			distribution: {
				age: true,
				count: true,
				byCategory: {
					categoryId: true,
					count: true
				}
			},
			byCategory: {
				categoryId: true,
				categoryName: true,
				categoryType: true,
				count: true,
				average: true
			},
			byCommittee: {
				committeeId: true,
				committeeName: true,
				abbreviation: true,
				count: true,
				average: true
			}
		},
		diet: {
			delegationMembers: {
				omnivore: true,
				vegan: true,
				vegetarian: true
			},
			singleParticipants: {
				omnivore: true,
				vegan: true,
				vegetarian: true
			},
			supervisors: {
				omnivore: true,
				vegetarian: true,
				vegan: true
			},
			teamMembers: {
				omnivore: true,
				vegan: true,
				vegetarian: true
			}
		},
		gender: {
			delegationMembers: {
				diverse: true,
				female: true,
				male: true,
				noStatement: true
			},
			singleParticipants: {
				diverse: true,
				female: true,
				male: true,
				noStatement: true
			},
			supervisors: {
				male: true,
				female: true,
				diverse: true,
				noStatement: true
			},
			teamMembers: {
				diverse: true,
				female: true,
				male: true,
				noStatement: true
			}
		},
		countdowns: {
			daysUntilConference: true,
			daysUntilEndRegistration: true
		},
		registered: {
			applied: true,
			delegationMembers: {
				applied: true,
				notApplied: true,
				total: true
			},
			delegations: {
				applied: true,
				notApplied: true,
				total: true
			},
			notApplied: true,
			singleParticipants: {
				applied: true,
				byRole: {
					applied: true,
					fontAwesomeIcon: true,
					notApplied: true,
					role: true,
					total: true
				},
				notApplied: true,
				total: true
			},
			supervisors: true,
			total: true
		},
		status: {
			postalStatus: {
				done: true,
				problem: true
			},
			paymentStatus: {
				done: true,
				problem: true
			},
			didAttend: true
		},
		roleBased: {
			delegationMembersWithRole: true,
			delegationMembersWithoutRole: true,
			delegationMembersWithCommittee: true,
			delegationMembersWithoutCommittee: true,
			singleParticipantsWithRole: true,
			singleParticipantsWithoutRole: true,
			delegationsWithAssignment: true,
			delegationsWithoutAssignment: true
		},
		committeeFillRates: {
			committeeId: true,
			name: true,
			abbreviation: true,
			totalSeats: true,
			assignedSeats: true,
			fillPercentage: true
		},
		registrationTimeline: {
			date: true,
			cumulativeDelegations: true,
			cumulativeDelegationMembers: true,
			cumulativeSingleParticipants: true,
			cumulativeSupervisors: true
		},
		nationalityDistribution: {
			country: true,
			countryCode: true,
			count: true
		},
		schoolStats: {
			school: true,
			delegationCount: true,
			memberCount: true
		},
		waitingList: {
			total: true,
			visible: true,
			hidden: true,
			assigned: true,
			unassigned: true
		},
		supervisorStats: {
			total: true,
			accepted: true,
			rejected: true,
			plansAttendance: true,
			doesNotPlanAttendance: true,
			acceptedAndPresent: true,
			acceptedAndNotPresent: true,
			rejectedAndPresent: true,
			rejectedAndNotPresent: true
		},
		postalPaymentProgress: {
			maxParticipants: true,
			postalDone: true,
			postalPending: true,
			postalProblem: true,
			postalPercentage: true,
			paymentDone: true,
			paymentPending: true,
			paymentProblem: true,
			paymentPercentage: true,
			bothComplete: true,
			postalOnlyComplete: true,
			paymentOnlyComplete: true,
			neitherComplete: true
		},
		paperStats: {
			total: true,
			byType: {
				positionPaper: true,
				workingPaper: true,
				introductionPaper: true
			},
			byStatus: {
				draft: true,
				submitted: true,
				changesRequested: true,
				accepted: true
			},
			withReviews: true,
			withoutReviews: true,
			byCommittee: {
				committeeId: true,
				name: true,
				abbreviation: true,
				count: true
			}
		}
	});
}

export type ConferenceStatistics = Awaited<ReturnType<typeof fetchConferenceStatistics>>;

/** What the widgets receive: the page's data with the currently filtered statistics folded in. */
export type StatsWidgetData = { stats: ConferenceStatistics };
