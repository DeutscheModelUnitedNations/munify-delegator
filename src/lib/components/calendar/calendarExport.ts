/** Links that hand a calendar subscription to calendar apps. */

/** The `webcal:` form of a feed link, which opens the device's calendar app to subscribe. */
export function webcalUrl(feedUrl: string) {
	return feedUrl.replace(/^https?:/, 'webcal:');
}

/** Google Calendar's page for adding a calendar by its link. */
export function googleCalendarSubscribeUrl(feedUrl: string) {
	const url = new URL('https://calendar.google.com/calendar/render');
	url.searchParams.set('cid', webcalUrl(feedUrl));
	return url.href;
}
