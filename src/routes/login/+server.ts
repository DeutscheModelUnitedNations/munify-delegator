import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Starts the sign-in from a public page. The route is protected (`AUTHENTICATED_ROUTES`), so the
 * OIDC handle sends visitors without a session to the provider and brings them back here, where
 * they are sent on to `next` - a path on this site, never another origin.
 */
export const GET: RequestHandler = ({ url }) => {
	const next = url.searchParams.get('next') ?? '';
	redirect(302, next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
};
