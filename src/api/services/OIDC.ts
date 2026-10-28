import { building, dev } from '$app/env';
import { makeCookieNames, makeOIDC } from '@m1212e/sveltekit-oidc';
import { OIDC_CLIENT_SECRET, OIDC_SCOPES } from '$app/env/private';
import { PUBLIC_OIDC_AUTHORITY, PUBLIC_OIDC_CLIENT_ID } from '$app/env/public';
import { upsertSelfFromClaims } from './account/upsertSelf';
import { deLocalizeUrl } from '#lib/paraglide/runtime.js';

export const oidcRoles = ['admin', 'member', 'service_user'] as const;

/**
 * Everything behind the `(authenticated)` route group, except the conference selector at
 * `/dashboard` itself: matched by prefix, so the trailing slash leaves it public. `/login` exists
 * to start the sign-in from there and send the visitor back.
 */
const AUTHENTICATED_ROUTES = [
	'/dashboard/',
	'/registration',
	'/my-account',
	'/team-tender',
	'/login'
];

/**
 * The path SvelteKit routes a URL to: without the locale prefix Paraglide's `url` strategy puts on
 * non-default locales (`/en/dashboard/…`, rerouted by `src/hooks.ts`). `event.url` keeps the
 * prefix, so everything that decides by path has to look at this instead - otherwise an English
 * URL would never match a route guard written for the German one.
 */
export function routePath(url: URL): string {
	return deLocalizeUrl(url).pathname;
}

/** Whether a route path (see `routePath`) needs a session, before `isPublicRoute` is applied. */
export function isAuthenticatedPath(pathname: string): boolean {
	return AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route));
}

/** Pages under `/dashboard/` that need a login although they look like a conference id. */
const LOGIN_ONLY_DASHBOARD_PAGES = ['seed', 'conference-request'];

/**
 * A conference's own dashboard page and its seat overview are public: they show what is public
 * about the conference to visitors who are not signed in (and what they would have to do to take
 * part). Everything below it - and the pages that merely sit next to the conference ids - needs a
 * session. The library only matches routes by prefix, so the hooks use this to let the visitor
 * through where the library would redirect. Takes a route path (see `routePath`).
 */
export function isPublicRoute(pathname: string): boolean {
	const match = /^\/dashboard\/([^/]+)(?:\/seats)?\/?$/.exec(pathname);
	return !!match && !LOGIN_ONLY_DASHBOARD_PAGES.includes(match[1]);
}

/**
 * The session cookies' names, with the library's default prefix (we pass no `cookiePrefix`). Built
 * here rather than read off `OIDC.cookieNames` because `OIDC` does not exist during the build, and
 * a handle that runs before `OIDC.handle` has to tell a returning session from a fresh visitor.
 */
export const oidcCookieNames = makeCookieNames();

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

/**
 * Normalize OIDC claims from different providers into a consistent shape.
 *
 * TODO: make this part of the library
 *
 * Logto uses `username` instead of `preferred_username`, and a single `name` instead of
 * `given_name`/`family_name`.
 */
function normalizeOIDCClaims(claims: Record<string, unknown>) {
	const sub = asString(claims.sub);
	if (!sub) {
		throw new Error('OIDC claim "sub" is missing or invalid');
	}

	let givenName = asString(claims.given_name);
	let familyName = asString(claims.family_name);
	const name = asString(claims.name);

	if ((!givenName || !familyName) && name) {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			givenName = parts.slice(0, -1).join(' ');
			familyName = parts[parts.length - 1];
		} else {
			givenName = name;
			familyName = name;
		}
	}

	return {
		sub,
		email: asString(claims.email),
		locale: asString(claims.locale),
		preferred_username: asString(claims.preferred_username) ?? asString(claims.username),
		given_name: givenName,
		family_name: familyName,
		phone: asString(claims.phone)
	};
}

/**
 * A provider on this machine (oidc-mock under `vite dev` or `vite preview`). Only it is trusted
 * over plain HTTP, which is what lets the e2e suite run against a production build.
 */
function isLoopbackIssuer(authority: string): boolean {
	const { protocol, hostname } = new URL(authority);
	return protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(hostname);
}

/**
 * The OIDC flow, owned by the library rather than by route loads.
 *
 * Its `handle` hook protects `authenticatedRoutes`, serves both callback routes and puts the
 * validated session on `event.locals.oidc`, which is where `#api/context.js` reads it. The callback
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
			userLoggedInSuccessfully: async ({ user }) => {
				await upsertSelfFromClaims(normalizeOIDCClaims(user as Record<string, unknown>));
			}
		})
	: ({} as Awaited<ReturnType<typeof makeOIDC>>);
