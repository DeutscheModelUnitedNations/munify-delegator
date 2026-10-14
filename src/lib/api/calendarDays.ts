import { client } from '$lib/api/rumbleClient/client';

/** The conference's schedule: its days with their tracks and entries, in the order they happen */
export function fetchCalendarDays(conferenceId: string) {
	return client.query.calendarDays({
		__args: {
			where: { conferenceId: { eq: conferenceId } },
			orderBy: { sortOrder: 'asc' }
		},
		id: true,
		name: true,
		date: true,
		sortOrder: true,
		tracks: { id: true, name: true, description: true, sortOrder: true },
		entries: {
			id: true,
			startTime: true,
			endTime: true,
			name: true,
			description: true,
			fontAwesomeIcon: true,
			color: true,
			place: {
				id: true,
				name: true,
				address: true,
				latitude: true,
				longitude: true,
				directions: true,
				info: true,
				websiteUrl: true,
				sitePlanFile: { url: true }
			},
			room: true,
			tracks: { id: true }
		}
	});
}
