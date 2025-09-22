import { graphql } from '$houdini';
import type { DelegationAssignmentDataQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query DelegationAssignmentDataQuery($userId: String!, $conferenceId: String!) {
		findUniqueDelegationMember(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			isHeadDelegate
			assignedCommittee {
				id
			}
			delegation {
				id
				assignedNation {
					alpha3Code
					alpha2Code
				}
				members {
					id
					user {
						id
						family_name
						given_name
					}
					assignedCommittee {
						id
					}
				}
			}
		}

		findManyCommittees(where: { conferenceId: { equals: $conferenceId } }) {
			id
			abbreviation
			name
			nations {
				alpha3Code
				alpha2Code
			}
			numOfSeatsPerDelegation
		}
	}
`);

export const _DelegationAssignmentDataQueryVariables: DelegationAssignmentDataQueryVariables =
	async (event) => {
		const { user } = await event.parent();

		return {
			userId: user.sub
		};
	};
