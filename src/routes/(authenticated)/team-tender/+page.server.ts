import type { PageServerLoad } from './$types';
import { graphql } from '$houdini';
import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';

const userQuery = graphql(`
	query TeamTenderStatusQuery($id: String!) {
		findUniqueUser(where: { id: $id }) {
			wantsJoinTeamInformation
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const { data } = await userQuery.fetch({ event, variables: { id: user.sub }, blocking: true });

	if (!data?.findUniqueUser) {
		throw error(404, m.userNotFound());
	}

	return {
		wantsJoinTeamInformation: data.findUniqueUser.wantsJoinTeamInformation
	};
};
