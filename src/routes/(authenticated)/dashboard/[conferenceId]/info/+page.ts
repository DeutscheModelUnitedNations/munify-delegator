/**
 * @deprecated LEGACY PAGE - No links lead to this page anymore.
 * Conference info/announcements are now displayed directly on the dashboard
 * via the AnnouncementContent component. This page is kept for backwards
 * compatibility with any bookmarked URLs but may be removed in the future.
 */

import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ConferenceInfoQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
			info
		}
	}
`);

export const _ConferenceInfoQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
