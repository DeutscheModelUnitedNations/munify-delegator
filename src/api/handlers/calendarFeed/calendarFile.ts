import { error, type RequestEvent } from '@sveltejs/kit';
import { feedSchedule } from './feedSchedule';
import { icsCalendar } from './icsCalendar';

/** The schedule as a calendar file response, read as the request's caller. 404 for a conference they may not read. */
export async function calendarFileResponse({
	event,
	conferenceId,
	userId,
	download
}: {
	event: RequestEvent;
	conferenceId: string;
	userId: string;
	/** Saved as a file rather than read by a calendar app. */
	download: boolean;
}) {
	const schedule = await feedSchedule({ event, conferenceId, userId });
	if (!schedule) error(404, 'Not found');
	const body = icsCalendar({
		name: schedule.title,
		timezone: schedule.timezone,
		events: schedule.events,
		host: event.url.hostname
	});
	return new Response(body, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': `${download ? 'attachment' : 'inline'}; filename="schedule.ics"`,
			// personal: no shared cache may keep it
			'cache-control': 'private, no-store'
		}
	});
}
