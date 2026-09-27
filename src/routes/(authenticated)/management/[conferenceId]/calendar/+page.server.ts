import { client } from '$lib/api/rumbleClient/client';
import type { PageServerLoad } from './$types';

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

export const load: PageServerLoad = async (event) => {
	const conferenceId = event.params.conferenceId;

	const [calendarDays, places, conference] = await Promise.all([
		client.query.calendarDays({
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
		client.query.places({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { name: 'asc' }
			},
			...placeSelection
		}),
		client.query.conference({ __args: { id: conferenceId }, timezone: true })
	]);

	return {
		calendarDays,
		places,
		conferenceId,
		timezone: conference?.timezone ?? 'Europe/Berlin'
	};
};
