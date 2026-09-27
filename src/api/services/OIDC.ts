import { building, dev } from '$app/environment';
import { makeOIDC } from '@m1212e/sveltekit-oidc';
import { configPrivate } from '$config/private';
import { configPublic } from '$config/public';
import { upsertSelfFromClaims } from './upsertSelf';

export const oidcRoles = ['admin', 'member', 'service_user'] as const;

/** Everything behind the `(authenticated)` route group. */
export const AUTHENTICATED_ROUTES = [
	'/dashboard',
	'/management',
	'/registration',
	'/assignment-assistant',
	'/my-account',
	'/team-tender'
];

/**
 * The library's default cookie prefix. We do not pass `cookiePrefix`, so this is what it uses;
 * it is repeated here because the library keeps the derived names internal and a handle that runs
 * before `OIDC.handle` has to be able to tell a returning session from a fresh visitor.
 */
const OIDC_COOKIE_PREFIX = 'auth_oidc_';

export const accessTokenCookieName = `${OIDC_COOKIE_PREFIX}access_token`;
export const refreshTokenCookieName = `${OIDC_COOKIE_PREFIX}refresh_token`;

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

/**
 * Normalize OIDC claims from different providers into a consistent shape.
 *
 * Logto uses `username` instead of `preferred_username`, and a single `name` instead of
 * `given_name`/`family_name`.
 */
export function normalizeOIDCClaims(claims: Record<string, unknown>) {
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
 * The OIDC flow, owned by the library rather than by route loads.
 *
 * Its `handle` hook protects `authenticatedRoutes`, serves both callback routes and puts the
 * validated session on `event.locals.oidc`, which is where `$api/context` reads it. The callback
 * routes keep the paths they had, so an identity provider's client configuration does not have to
 * change.
 */
export const OIDC = !building
	? await makeOIDC({
			development: dev,
			oidcAuthority: configPublic.PUBLIC_OIDC_AUTHORITY,
			oidcClientId: configPublic.PUBLIC_OIDC_CLIENT_ID,
			oidcClientSecret: configPrivate.OIDC_CLIENT_SECRET,
			oidcScope: configPrivate.OIDC_SCOPES,
			loginCallbackRoute: '/auth/login-callback',
			logoutCallbackRoute: '/auth/logout-callback',
			authenticatedRoutes: AUTHENTICATED_ROUTES,
			// The library appends this to the origin, so '' is the landing page and '/' would
			// produce a double slash.
			logoutPath: '',
			allowBearerToken: true,
			logLevel: dev ? 'info' : 'warn',
			userLoggedInSuccessfully: async ({ user }) => {
				await upsertSelfFromClaims(normalizeOIDCClaims(user as Record<string, unknown>));
			}
		})
	: ({} as Awaited<ReturnType<typeof makeOIDC>>);
