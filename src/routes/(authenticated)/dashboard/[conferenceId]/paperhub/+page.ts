import { graphql } from '$houdini';
import type { GetMyPapersQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query GetMyPapersQuery($userId: String!, $conferenceId: String!) {
		findManyPapers(
			where: { authorId: { equals: $userId }, conferenceId: { equals: $conferenceId } }
		) {
			id
			status
			type
			createdAt
			updatedAt
			firstSubmittedAt

			agendaItem {
				id
				title
				committee {
					id
					abbreviation
				}
			}
		}
	}
`);

export const _GetMyPapersQueryVariables: GetMyPapersQueryVariables = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	return {
		userId: user.sub,
		conferenceId
	};
};
