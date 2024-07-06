import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const frontendURL = import.meta.env.VITE_FRONTEND_URL;
	return { conferenceId: params.conference, frontendURL: frontendURL };
};
