import { building, dev } from '$app/env';
import { makeOIDC } from '@m1212e/sveltekit-oidc';
import { isRedirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { OIDC_CLIENT_SECRET, OIDC_ROLE_CLAIM, OIDC_SCOPES } from '$app/env/private';
import { PUBLIC_OIDC_AUTHORITY, PUBLIC_OIDC_CLIENT_ID } from '$app/env/public';
import { providerClaims } from '../account/providerClaims';
import { upsertSelfFromClaims } from '../account/upsertSelf';
import { userInfoClaims } from './userInfoClaims';
import { deLocalizeUrl } from '#lib/paraglide/runtime';

/**
 * Everything behind the `(authenticated)` route group, except the conference selector at
 * `/dashboard` itself: matched by prefix, so the trailing slash leaves it public. `/login` exists
 * to start the sign-in from there and send the visitor back.
 */
const AUTHENTICATED_ROUTE_PREFIXES = [
	'/dashboard/',
	'/registration',
	'/my-account',
	'/team-tender',
	'/login'
];

/** Pages under `/dashboard/` that need a login although they look like a conference id. */
const LOGIN_ONLY_DASHBOARD_PAGES = ['seed', 'conference-request'];

/** `/dashboard/<page>` or `/dashboard/<page>/seats`, capturing `<page>`. */
const DASHBOARD_PAGE_PATH = /^\/dashboard\/([^/]+)(?:\/seats)?\/?$/;

/**
 * The path SvelteKit routes a URL to: without the locale prefix Paraglide's `url` strategy puts on
 * non-default locales (`/en/dashboard/…`, rerouted by `src/hooks.ts`). `event.url` keeps the
 * prefix, so everything that decides by path has to look at this instead - otherwise an English
 * URL would never match a route guard written for the German one.
 */
function routePath(url: URL): string {
	return deLocalizeUrl(url).pathname;
}

/** Whether a route path (see `routePath`) needs a session, before `isPublicRoute` is applied. */
function isAuthenticatedPath(path: string): boolean {
	return AUTHENTICATED_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * A conference's own dashboard page and its seat overview are public: they show what is public
 * about the conference to visitors who are not signed in (and what they would have to do to take
 * part). Everything below it - and the pages that merely sit next to the conference ids - needs a
 * session. The library only matches routes by prefix, so the hooks use this to let the visitor
 * through where the library would redirect. Takes a route path (see `routePath`).
 */
function isPublicRoute(path: string): boolean {
	const dashboardPage = DASHBOARD_PAGE_PATH.exec(path)?.[1];
	return !!dashboardPage && !LOGIN_ONLY_DASHBOARD_PAGES.includes(dashboardPage);
}

/**
 * A provider on this machine (oidc-mock under `vite dev` or `vite preview`). Only it is trusted
 * over plain HTTP, which is what lets the e2e suite run against a production build.
 */
function isLoopbackIssuer(issuer: string): boolean {
	const { protocol, hostname } = new URL(issuer);
	return protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(hostname);
}

/**
 * The OIDC flow, owned by the library rather than by route loads.
 *
 * Its `handle` hook protects `authenticatedRoutes`, serves both callback routes and puts the
 * validated session on `event.locals.oidc`, which is where `#api/context` reads it. The callback
 * routes keep the paths they had, so an identity provider's client configuration does not have to
 * change.
 */
export const OIDC = !building
	? await makeOIDC({
			development: dev || isLoopbackIssuer(PUBLIC_OIDC_AUTHORITY),
			issuer: PUBLIC_OIDC_AUTHORITY,
			clientId: PUBLIC_OIDC_CLIENT_ID,
			clientSecret: OIDC_CLIENT_SECRET,
			scope: OIDC_SCOPES,
			loginCallbackRoute: '/auth/login-callback',
			logoutCallbackRoute: '/auth/logout-callback',
			// A function rather than the list: the library would match the list against the
			// localized `url.pathname`, which the guard has to see without its locale prefix.
			authenticatedRoutes: (url) => isAuthenticatedPath(routePath(url)),
			logoutPath: '/',
			allowBearerToken: true,
			logLevel: dev ? 'info' : 'warn',
			userLoggedInSuccessfully: async ({ user }, { returnTo }) => {
				await upsertSelfFromClaims({ claims: providerClaims.parse(user), returnTo });
			}
		})
	: // TYPE-SAFETY-EXCEPTION: nothing may connect to the provider during `vite build`, and nothing
		// uses `OIDC` there either
		({} as Awaited<ReturnType<typeof makeOIDC>>);

/**
 * The OIDC handle, except that a public page (see `isPublicRoute`) is served without a session
 * instead of redirecting to the provider. A visitor who is signed in still gets their session on
 * `event.locals.oidc`.
 */
export const oidcHandle: Handle = async (input) => {
	if (!isPublicRoute(routePath(input.event.url))) {
		return OIDC.handle(input);
	}
	try {
		return await OIDC.handle(input);
	} catch (error) {
		if (isRedirect(error)) {
			return input.resolve(input.event);
		}
		throw error;
	}
};

/**
 * Asks the provider's userinfo endpoint for the roles claim when neither token carries it, for the
 * session and, while impersonating, the impersonator's own (`rolesOfSession` reads both). Cached
 * per access token, so this is one request per token, not per page.
 */
export const userInfoHandle: Handle = async ({ event, resolve }) => {
	const claim = OIDC_ROLE_CLAIM;
	const session = event.locals.oidc;
	if (claim && session) {
		const sessions = session.impersonator ? [session, session.impersonator] : [session];
		await Promise.all(
			sessions.map((s) =>
				userInfoClaims.load({
					session: s,
					claim,
					fetchUserInfo: (accessToken, sub) =>
						OIDC.core.fetchUserInfoFromIssuer({ accessToken, expectedSubject: sub })
				})
			)
		);
	}
	return resolve(event);
};
