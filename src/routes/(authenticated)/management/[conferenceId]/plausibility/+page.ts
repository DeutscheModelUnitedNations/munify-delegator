import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query PlausibilityQuery($conferenceId: String!) {
		conferencePlausibility(conferenceId: $conferenceId) {
			dataMissing {
				id
				given_name
				family_name
			}
			shouldBeSupervisor {
				id
				family_name
				given_name
			}
			shouldNotBeSupervisor {
				id
				family_name
				given_name
			}
			tooOldUsers {
				id
				family_name
				given_name
			}
			tooYoungUsers {
				id
				family_name
				given_name
			}
		}
	}
`);

export const _PlausibilityQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
