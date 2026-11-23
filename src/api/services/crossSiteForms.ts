import type { Handle } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';

/**
 * SvelteKit's own protection against forms of other sites (CSRF), for every route but the WebDAV
 * folder scanners upload to: they send files without a content type and know no `Origin`, which
 * SvelteKit takes for such a form, and it can only be told to leave all routes alone
 * (`csrf.trustedOrigins` in `vite.config.ts`). The folder reads no cookies, only its own login, so
 * there is nothing another site could make use of.
 */

/** What a form of a page can send (and SvelteKit's own), which no preflight asks about first. */
const FORM_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
	'application/x-sveltekit-formdata'
];
const WRITING = ['POST', 'PUT', 'PATCH', 'DELETE'];
const EXEMPT_ROUTE = '/api/scans/[...path]';

/** Whether a request may be a form another site's page sent. */
export function isCrossSiteForm({ request, origin }: { request: Request; origin: string }) {
	if (!WRITING.includes(request.method) || request.headers.get('origin') === origin) return false;
	const type = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
	return type === '' || FORM_TYPES.includes(type);
}

/** Refuses forms of other sites (403). Off in development, as SvelteKit's is. */
export const crossSiteFormHandle: Handle = ({ event, resolve }) => {
	const { request, url, route } = event;
	if (!dev && route.id !== EXEMPT_ROUTE && isCrossSiteForm({ request, origin: url.origin })) {
		return new Response(`Cross-site ${request.method} form submissions are forbidden`, {
			status: 403
		});
	}
	return resolve(event);
};
