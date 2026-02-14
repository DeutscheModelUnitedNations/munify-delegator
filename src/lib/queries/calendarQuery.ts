import { graphql } from '$houdini';

export const calendarQuery = graphql(`
	query CalendarQuery($conferenceId: String!) {
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
