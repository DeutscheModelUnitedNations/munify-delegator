import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// The scanner moved under management/; keep old links and bookmarks working
export const load: PageLoad = ({ params, url }) => {
	redirect(302, `/dashboard/${params.conferenceId}/management/attendance${url.search}`);
};
