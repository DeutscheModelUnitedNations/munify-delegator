import type { PageServerLoad } from './$types';
import { client } from '$lib/api/rumbleClient/client';
import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();
	const dbUser = await client.query.user({
		__args: { id: user.sub },
		wantsJoinTeamInformation: true
	});

	if (!dbUser) {
		throw error(404, m.userNotFound());
	}

	return { wantsJoinTeamInformation: dbUser.wantsJoinTeamInformation };
};
