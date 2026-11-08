import { client } from '#lib/api/rumbleClient/client';

/** What the schedule shows of a day: its tracks and entries */
export const calendarDayFields = {
	id: true,
	name: true,
	date: true,
	tracks: {
		id: true,
		name: true,
		description: true,
		sortOrder: true,
		// whose seats the track is for, which the dashboard's timeline follows
		committees: { id: true },
		conferenceRoles: { id: true }
	},
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
} as const;

/** The days of a conference's schedule, in the order they happen */
export function calendarDaysOf(conferenceId: string) {
	return {
		where: { conferenceId: { eq: conferenceId } },
		orderBy: { date: 'asc' as const }
	};
}

/** The conference's schedule: its days with their tracks and entries, in the order they happen */
export function fetchCalendarDays(conferenceId: string) {
	return client.query.calendarDays({ __args: calendarDaysOf(conferenceId), ...calendarDayFields });
}
