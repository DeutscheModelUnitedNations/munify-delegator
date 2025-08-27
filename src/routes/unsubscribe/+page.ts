import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	const prefillEmail = event.url.searchParams.get('email') || undefined;

	return {
		prefillEmail
	};
};
