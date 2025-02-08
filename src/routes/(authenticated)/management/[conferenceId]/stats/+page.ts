import { graphql } from '$houdini';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

const statsQuery = graphql(`
	query ConferenceStatsQuery($conferenceID: ID!) {
		getConferenceStatistics(conferenceId: $conferenceID) {
			age {
				average
				distribution {
					key
					value
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
					vegan
					vegetarian
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
					diverse
					female
					male
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
					withSupervisor
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
		}
	}
`);

export const load: PageLoad = async (event) => {
	const conferenceId = event.params.conferenceId;
	const { data } = await statsQuery.fetch({
		event,
		variables: { conferenceID: conferenceId },
		blocking: true
	});

	console.log(data);

	if (!data) {
		throw error(404, 'Data not found');
	}
	return {
		stats: data.getConferenceStatistics
	};
};
