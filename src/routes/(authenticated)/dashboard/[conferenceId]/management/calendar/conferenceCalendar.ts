import { client } from '$lib/api/rumbleClient/client';

/** The whole programme of a conference as the preview shows it: days, tracks, entries, places. */
export async function fetchConferenceCalendar(conferenceId: string) {
	const [calendarDays, conference] = await Promise.all([
		client.liveQuery.calendarDays({
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
					sitePlanDataURL: true
				},
				room: true,
				calendarTrackId: true
			}
		}),
		client.liveQuery.conference({ __args: { id: conferenceId }, timezone: true })
	]);
	return {
		calendarDays,
		timezone: conference?.timezone ?? 'Europe/Berlin'
	};
}
