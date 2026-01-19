import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query RoleSelectionQuery($conferenceId: String!) {
		findManyCustomConferenceRoles(where: { conferenceId: { equals: $conferenceId } }) {
			id
			name
			description
			fontAwesomeIcon
		}
	}
`);

export const _RoleSelectionQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
