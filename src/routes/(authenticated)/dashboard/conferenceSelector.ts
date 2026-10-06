import { client } from '$lib/api/rumbleClient/client';

/**
 * Every conference the selector offers. Today that is all of them for everyone; once visibility
 * follows the caller's permissions, this query is the one place that narrows it down.
 */
export function fetchSelectableConferences() {
	return client.liveQuery.conferences({
		__args: { orderBy: { startConference: 'asc' } },
		id: true,
		state: true,
		startConference: true
	});
}
