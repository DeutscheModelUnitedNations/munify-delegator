import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query SeatsOfConferenceQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
			committees {
				id
				abbreviation
				name
				numOfSeatsPerDelegation
				nations {
					alpha2Code
					alpha3Code
				}
				agendaItems {
					id
					title
					teaserText
				}
			}
			nonStateActors {
				id
				abbreviation
				name
				description
				fontAwesomeIcon
				seatAmount
			}
		}
	}
`);

export const _SeatsOfConferenceQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
