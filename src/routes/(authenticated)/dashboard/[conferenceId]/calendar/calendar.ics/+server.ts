import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { calendarFileResponse } from '#api/handlers/calendarFeed/calendarFile';

/** The schedule as a calendar file to import once, read as the signed-in caller. */
export const GET: RequestHandler = async (event) => {
	const userId = event.locals.oidc?.user.sub;
	if (!userId) error(401, 'Unauthorized');
	return calendarFileResponse({
		event,
		conferenceId: event.params.conferenceId,
		userId,
		download: true
	});
};
