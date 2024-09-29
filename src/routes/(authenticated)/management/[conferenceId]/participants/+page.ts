import type { PageLoad } from './$types';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { User } from '@prisma/client';

export type UserData = User & {
	delegationMemberships: { id: string; delegationId: string }[];
	singleParticipant: { id: string }[];
	conferenceSupervisor: { id: string }[];
};

export const load: PageLoad = loadApiHandler(async ({ parent, api, url }) => {
	const { conferenceData } = await parent();

	const participants: UserData[] = await checkForError(
		api.user.perConference({ conferenceId: conferenceData.id }).get()
	);

	return {
		participants,
		idQuery: url.searchParams.get('id') || undefined
	};
});
