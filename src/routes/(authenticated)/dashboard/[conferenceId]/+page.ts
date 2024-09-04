import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { checkForError } from '$api/client';

export const load: PageLoad = loadApiHandler(async ({ params, api, url }) => {
	if (params.conferenceId === undefined) error(404, 'Not found');

	const userData = await checkForError(api.user.me.get());

	let delegationData;
	let delegationMembershipData;
	let roleApplications;

	if (userData.delegationMemberships) {
		delegationMembershipData = userData.delegationMemberships?.find(
			(x) => x.conference.id === params.conferenceId
		);
		const delegationId = delegationMembershipData?.delegation.id;

		delegationData = await checkForError(api.delegation({ id: delegationId }).get());

		roleApplications = await checkForError(
			api.roleApplication.byDelegation({ delegationId }).get()
		);
	}

	return {
		conferenceId: params.conferenceId,
		delegationMembershipData,
		delegationData,
		roleApplications
	};
});
