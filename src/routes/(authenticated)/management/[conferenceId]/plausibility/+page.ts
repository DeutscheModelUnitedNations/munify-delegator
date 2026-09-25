import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

const userSummary = { id: true, givenName: true, familyName: true } as const;

export const load: PageLoad = async (event) => {
	return {
		plausibility: await client.query.conferencePlausibility({
			__args: { conferenceId: event.params.conferenceId },
			dataMissing: userSummary,
			shouldBeSupervisor: userSummary,
			shouldNotBeSupervisor: userSummary,
			tooOldUsers: userSummary,
			tooYoungUsers: userSummary
		})
	};
};
