import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { feedIdOfToken } from '#api/handlers/calendarFeed/calendarFeedToken';
import { calendarFeedOwner } from '#api/handlers/calendarFeed/calendarFeedService';
import { calendarFileResponse } from '#api/handlers/calendarFeed/calendarFile';

/**
 * A person's calendar subscription link (`calendarFeedUrl`): calendar apps fetch it without a
 * session, so the token stands for the person. The schedule is read as its owner, without any
 * system role (`locals.calendarFeedUserId`).
 */
export const GET: RequestHandler = async (event) => {
	const feedId = feedIdOfToken(event.params.token);
	const feed = feedId ? await calendarFeedOwner(feedId) : undefined;
	if (!feed) error(404, 'Not found');
	event.locals.calendarFeedUserId = feed.userId;
	return calendarFileResponse({
		event,
		conferenceId: feed.conferenceId,
		userId: feed.userId,
		download: false
	});
};
