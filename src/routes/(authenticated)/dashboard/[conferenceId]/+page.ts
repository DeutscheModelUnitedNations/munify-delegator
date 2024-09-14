import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { checkForError } from '$api/client';

export const load: PageLoad = loadApiHandler(async ({ params, api, url, parent }) => {
	if (params.conferenceId === undefined) error(404, 'Not found');

	const userData = (await parent()).userData;

	const delegationMembershipData = userData.delegationMemberships?.find(
		(x) => x.conferenceId === params.conferenceId
	);

	const delegationData = delegationMembershipData
		? await checkForError(api.delegation({ id: delegationMembershipData?.delegationId }).get())
		: undefined;

	const supervisorData = userData.conferenceSupervisor.find(
		(x) => x.conferenceId === params.conferenceId
	)
		? await checkForError(
				api.conferenceSupervisor.get({ query: { conferenceId: params.conferenceId } })
			)
		: undefined;

	const committees = await checkForError(
		api.committee.get({ query: { conferenceId: params.conferenceId } })
	);

	const nonStateActors = await checkForError(
		api.nonStateActor.get({ query: { conferenceId: params.conferenceId } })
	);

	return {
		conferenceId: params.conferenceId,
		delegationMembershipData,
		delegationData,
		committees,
		nonStateActors,
		supervisorData
	};
});
