import { redirect } from '@sveltejs/kit';
import { sameSitePath } from '#api/services/sameSitePath';
import type { RequestHandler } from './$types';

/**
 * Starts the sign-in from a public page. The route is protected (`AUTHENTICATED_ROUTES`), so the
 * OIDC handle sends visitors without a session to the provider and brings them back here, where
 * they are sent on to `next` - a path on this site, never another origin.
 */
export const GET: RequestHandler = ({ url }) => {
	redirect(302, sameSitePath(url.searchParams.get('next'), url.origin, '/dashboard'));
};
