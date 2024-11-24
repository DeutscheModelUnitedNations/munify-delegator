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

	console.log(data)

	if (!data) {
		throw error(404, 'Data not found');
	}
	return {
		stats: data.getConferenceStatistics
	};
};
