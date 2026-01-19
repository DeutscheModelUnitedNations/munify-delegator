import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ImportGetCommittees($conferenceId: String!) {
		findManyCommittees(where: { conferenceId: { equals: $conferenceId } }) {
			id
			abbreviation
			name
		}
	}
`);

export const _ImportGetCommitteesVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
