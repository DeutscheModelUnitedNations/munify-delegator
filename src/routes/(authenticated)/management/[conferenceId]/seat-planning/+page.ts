import { graphql } from '$houdini';
import type { SeatPlanningQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query SeatPlanningQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			state
			seatPlanningAssignments {
				committeeSeats {
					committeeId
					nationAlpha3Code
					memberNames
				}
				roles {
					nationAlpha3Code
					nonStateActorId
					memberCount
				}
			}
		}
		findManyCommittees(
			where: { conferenceId: { equals: $conferenceId } }
			orderBy: [{ createdAt: asc }]
		) {
			id
			name
			abbreviation
			numOfSeatsPerDelegation
			regionalBaseline
			regionalBaselineTargets
			nations {
				alpha2Code
				alpha3Code
			}
		}
		findManyNonStateActors(
			where: { conferenceId: { equals: $conferenceId } }
			orderBy: [{ createdAt: asc }]
		) {
			id
			name
			abbreviation
			description
			fontAwesomeIcon
			seatAmount
		}
	}
`);

export const _SeatPlanningQueryVariables: SeatPlanningQueryVariables = ({ params }) => ({
	conferenceId: params.conferenceId
});
