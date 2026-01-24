import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	redirect(302, `/dashboard/${params.conferenceId}/team-management/members`);
};
