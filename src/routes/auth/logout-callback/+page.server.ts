import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { codeVerifierCookieName, tokensCookieName } from '$api/auth/flow';

export const load: PageServerLoad = loadApiHandler(async ({ api, url, cookies }) => {
	cookies.delete(tokensCookieName, { path: '/' });
	cookies.delete(codeVerifierCookieName, { path: '/' });

	redirect(303, '/');
});
