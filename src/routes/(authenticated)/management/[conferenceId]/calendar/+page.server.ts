import { graphql } from '$houdini';
import type { PageServerLoad } from './$types';

const ConferenceTimezoneQuery = graphql(`
	query ConferenceTimezoneQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			timezone
		}
	}
`);

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
				place {
					id
					name
					address
					latitude
					longitude
					directions
					info
					websiteUrl
					sitePlanDataURL
				}
				placeId
				room
				calendarTrackId
			}
		}
		findManyPlaces(where: { conferenceId: { equals: $conferenceId } }, orderBy: { name: asc }) {
			id
			name
			address
			latitude
			longitude
			directions
			info
			websiteUrl
			sitePlanDataURL
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const [{ data }, { data: conferenceData }] = await Promise.all([
		CalendarManagementQuery.fetch({
			event,
			variables: { conferenceId: event.params.conferenceId },
			blocking: true
		}),
		ConferenceTimezoneQuery.fetch({
			event,
			variables: { conferenceId: event.params.conferenceId },
			blocking: true
		})
	]);

	return {
		calendarDays: data?.findManyCalendarDays ?? [],
		places: data?.findManyPlaces ?? [],
		conferenceId: event.params.conferenceId,
		timezone: conferenceData?.findUniqueConference?.timezone ?? 'Europe/Berlin'
	};
};
