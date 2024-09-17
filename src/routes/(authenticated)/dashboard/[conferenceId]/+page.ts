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

	const supervisorData = userData.conferenceSupervisor.find(
		(x) => x.conferenceId === params.conferenceId
	)
		? await checkForError(
				api.conferenceSupervisor.mine({ conferenceId: params.conferenceId }).get()
			)
		: undefined;

	async function getSupervisorsDelegationData(data: NonNullable<typeof supervisorData>) {
		const supervisorsDelegationData = data
			? await Promise.all(
					data.delegations.map(async (x) => {
						return await checkForError(api.delegation({ id: x.id }).get());
					})
				)
			: undefined;

		return supervisorsDelegationData;
	}

	const committees = await checkForError(
		api.committee.get({ query: { conferenceId: params.conferenceId } })
	);

	const nonStateActors = await checkForError(
		api.nonStateActor.get({ query: { conferenceId: params.conferenceId } })
	);

	const delegationData = delegationMembershipData
		? await checkForError(api.delegation({ id: delegationMembershipData?.delegationId }).get())
		: undefined;

	const {logoutUrl} = await checkForError(api.auth['logout-url'].get());

	return {
		logoutUrl,
		conferenceId: params.conferenceId,
		delegationMembershipData,
		delegationData,
		committees,
		nonStateActors,
		supervisorData,
		supervisorsDelegationData: supervisorData
			? await getSupervisorsDelegationData(supervisorData)
			: undefined
	};
});
