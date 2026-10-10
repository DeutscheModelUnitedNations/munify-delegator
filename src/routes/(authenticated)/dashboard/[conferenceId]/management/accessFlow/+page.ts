import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Zugangskontrolle and Anwesenheitsscanner are one page now
export const load: PageLoad = ({ params, url }) => {
	redirect(302, `/dashboard/${params.conferenceId}/management/attendance${url.search}`);
};
