import { oidc } from './oidc';
import { permissions } from './permissions';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Builds request context including OIDC data, computed permissions, the original URL, and the request event.
 *
 * @param req - The incoming request event.
 * @returns An object with:
 *  - permissions: computed permission set for the request
 *  - oidc: OIDC authentication information derived from the request cookies
 *  - url: the request URL
 *  - event: the original RequestEvent
 */
export async function context(req: RequestEvent) {
	const oidcValue = await oidc(req.cookies);
	const perms = permissions(oidcValue);
	return { permissions: perms, oidc: oidcValue, url: req.url, event: req };
}

export type Context = Awaited<ReturnType<typeof context>>;
