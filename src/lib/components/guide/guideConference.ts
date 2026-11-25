import { client } from '#lib/api/rumbleClient/client';

/** The conference as the team's guide pages show scopes: its start, time zone and series. */
export function fetchGuideConference(conferenceId: string) {
	return client.liveQuery.conference({
		__args: { id: conferenceId },
		title: true,
		startConference: true,
		timezone: true,
		series: { name: true }
	});
}
