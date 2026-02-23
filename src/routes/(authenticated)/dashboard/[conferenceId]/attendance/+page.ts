import { graphql } from '$houdini';
import type { AttendanceScannerPageQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query AttendanceScannerPageQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
		}
	}
`);

export const _AttendanceScannerPageQueryVariables: AttendanceScannerPageQueryVariables = async (
	event
) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
