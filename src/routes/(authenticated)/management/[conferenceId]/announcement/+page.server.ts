import { graphql } from '$houdini';
import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

const AnnouncementQuery = graphql(`
	query AnnouncementQuery($id: String!) {
		findUniqueConference(where: { id: $id }) {
			info
			showInfoExpanded
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const result = await AnnouncementQuery.fetch({
		event,
		variables: { id: event.params.conferenceId },
		blocking: true
	});

	const conference = result.data?.findUniqueConference;

	if (!conference) {
		throw error(404, m.notFound());
	}

	return {
		info: conference.info ?? '',
		showInfoExpanded: conference.showInfoExpanded,
		conferenceId: event.params.conferenceId
	};
};
