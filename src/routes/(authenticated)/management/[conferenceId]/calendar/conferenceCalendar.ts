import { client } from '$lib/api/rumbleClient/client';

const placeSelection = {
	id: true,
	name: true,
	address: true,
	latitude: true,
	longitude: true,
	directions: true,
	info: true,
	websiteUrl: true,
	sitePlanDataURL: true
} as const;

/** The whole programme of a conference: its days with tracks and entries, plus its places. */
export async function fetchConferenceCalendar(conferenceId: string) {
	const [calendarDays, places, conference] = await Promise.all([
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
				place: placeSelection,
				placeId: true,
				room: true,
				calendarTrackId: true
			}
		}),
		client.liveQuery.places({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { name: 'asc' }
			},
			...placeSelection
		}),
		client.liveQuery.conference({ __args: { id: conferenceId }, timezone: true })
	]);
	return {
		calendarDays,
		places,
		timezone: conference?.timezone ?? 'Europe/Berlin'
	};
}

export type ConferenceCalendar = Awaited<ReturnType<typeof fetchConferenceCalendar>>;
