import { client } from '#lib/api/rumbleClient/client';

/**
 * Every conference the selector offers. The API's read rules narrow it to the conferences the
 * caller is a member of plus those currently open for registration.
 */
export function fetchSelectableConferences() {
	return client.liveQuery.conferences({
		__args: { orderBy: { startConference: 'asc' } },
		id: true,
		title: true,
		state: true,
		startConference: true
	});
}
