import { graphql } from '$houdini';
import type { PageServerLoad } from './$types';

const CalendarManagementQuery = graphql(`
	query CalendarManagementQuery($conferenceId: String!) {
		findManyCalendarDays(
			where: { conferenceId: { equals: $conferenceId } }
			orderBy: { sortOrder: asc }
		) {
			id
			name
			date
			sortOrder
			tracks {
				id
				name
				description
				sortOrder
			}
			entries {
				id
				startTime
				endTime
				name
				description
				fontAwesomeIcon
				color
				place
				room
				calendarTrackId
			}
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { data } = await CalendarManagementQuery.fetch({
		event,
		variables: { conferenceId: event.params.conferenceId },
		blocking: true
	});

	return {
		calendarDays: data?.findManyCalendarDays ?? [],
		conferenceId: event.params.conferenceId
	};
};
