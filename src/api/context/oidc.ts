import { z } from 'zod';
import { oidcRoles, refresh, validateTokens, getJwks, type OIDCUser } from '$api/services/OIDC';
import { configPrivate } from '$config/private';
import { configPublic } from '$config/public';
import type { RequestEvent } from '@sveltejs/kit';
import { GraphQLError } from 'graphql';
import { jwtVerify } from 'jose';
import { db } from '$db/db';

const TokenCookieSchema = z
	.object({
		refresh_token: z.string(),
		access_token: z.string(),
		token_type: z.string(),
		id_token: z.string(),
		scope: z.string(),
		expires_in: z.number(),
		session_state: z.any()
	})
	.partial();

export type TokenCookieSchemaType = z.infer<typeof TokenCookieSchema>;

export type ImpersonationContext = {
	isImpersonating: boolean;
	originalUser?: OIDCUser;
	impersonatedUser?: OIDCUser;
	actorInfo?: Record<string, unknown>;
	startedAt?: Date;
};

export const tokensCookieName = 'token_set';
export const impersonationTokenCookieName = 'impersonation_token_set';

/**
 * Parse and validate OIDC roles from raw claim data.
 * Handles multiple provider formats: plain string arrays, objects with `.name` property, or key-value objects.
 *
 * @param rolesRaw - The raw roles claim value from the OIDC token
 * @param allowedRoles - Set or array of allowed role values
 * @returns Array of validated role names
 */
function parseOidcRoles(
	rolesRaw: unknown,
	allowedRoles: readonly string[]
): (typeof oidcRoles)[number][] {
	const result: string[] = [];

	if (Array.isArray(rolesRaw)) {
		for (const role of rolesRaw) {
			if (typeof role === 'string') {
				// Simple string array (e.g. ["admin"])
				result.push(role);
			} else if (role && typeof role === 'object' && 'name' in role) {
				// Logto returns role objects (e.g. [{name: "admin", ...}])
				const roleName = role.name;
				if (typeof roleName === 'string') {
					result.push(roleName);
				}
			}
		}
	} else if (rolesRaw && typeof rolesRaw === 'object') {
		// Zitadel returned roles as an object with role names as keys
		const roleNames = Object.keys(rolesRaw);
		result.push(...roleNames);
	}

	// Filter to only allowed roles
	return result.filter((role) => allowedRoles.includes(role)) as (typeof oidcRoles)[number][];
}

/**
 * Builds an OIDC context from request cookies: validates or refreshes tokens, extracts roles, and handles optional impersonation.
 *
 * @param cookies - The request cookie store used to read and set token cookies
 * @returns An object containing:
 *  - `nextTokenRefreshDue`: a `Date` when the access token will expire, or `undefined`
 *  - `tokenSet`: the token cookie contents matching `TokenCookieSchemaType`, or `undefined`
 *  - `user`: the validated OIDC user augmented with `hasRole` and `OIDCRoleNames`, or `undefined`
 *  - `impersonation`: an `ImpersonationContext` describing impersonation state
 */
export async function oidc(cookies: RequestEvent['cookies']) {
	const cookie = cookies.get(tokensCookieName);
	if (!cookie) {
		return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
	}
	const tokenSetRaw = await TokenCookieSchema.safeParse(JSON.parse(cookie));
	if (!tokenSetRaw.success) {
		console.error('Failed to parse token set', tokenSetRaw.error);
		return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
	}

	let tokenSet = tokenSetRaw.data;

	if (!tokenSet.access_token) {
		console.error('Incoming token set did not provide an access token!');
		return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
	}

	let user: Awaited<ReturnType<typeof validateTokens>> | undefined = undefined;

	try {
		user = await validateTokens({
			access_token: tokenSet.access_token,
			id_token: tokenSet.id_token
		});
	} catch (error) {
		console.debug(
			`[OIDC] Token validation failed (${error instanceof Error ? error.message : 'unknown'}), attempting refresh`
		);
	}

	if (!user) {
		try {
			if (!tokenSet.refresh_token) throw new GraphQLError('No refresh token available');
			const refreshed = await refresh(tokenSet.refresh_token);
			const cookieValue: TokenCookieSchemaType = {
				access_token: refreshed.access_token,
				expires_in: refreshed.expires_in,
				id_token: refreshed.id_token,
				refresh_token: refreshed.refresh_token,
				scope: refreshed.scope,
				session_state: refreshed.session_state,
				token_type: refreshed.token_type
			};

			cookies.set(tokensCookieName, JSON.stringify(cookieValue), {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: refreshed.expires_in ?? undefined
			});

			// Make refreshed token set effective for the rest of this request lifecycle
			tokenSet = cookieValue;

			try {
				user = await validateTokens({
					access_token: refreshed.access_token,
					id_token: refreshed.id_token
				});
			} catch (e) {
				console.warn(
					`[OIDC] Refreshed tokens failed validation: ${e instanceof Error ? e.message : e}`
				);
				return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
			}
		} catch (error) {
			console.warn(
				`[OIDC] Token refresh failed: ${error instanceof Error ? error.message : error}`
			);
			return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
		}
	}

	let OIDCRoleNames: (typeof oidcRoles)[number][] = [];

	if (user && configPrivate.OIDC_ROLE_CLAIM) {
		const rolesRaw = user[configPrivate.OIDC_ROLE_CLAIM];
		OIDCRoleNames = parseOidcRoles(rolesRaw, oidcRoles);
	}

	const hasRole = (role: (typeof OIDCRoleNames)[number]) => {
		return OIDCRoleNames.includes(role);
	};

	// Check for impersonation
	let impersonationContext: ImpersonationContext = { isImpersonating: false };

	const impersonationCookie = cookies.get(impersonationTokenCookieName);

	if (impersonationCookie && user) {
		try {
			const impersonationTokenSet = TokenCookieSchema.safeParse(JSON.parse(impersonationCookie));

			if (impersonationTokenSet.success && impersonationTokenSet.data.access_token) {
				// Verify the impersonation JWT cryptographically against the OIDC issuer JWKS
				const jwks = getJwks();
				if (!jwks) {
					throw new Error('JWKS not available for impersonation token verification');
				}

				let verifiedPayload;
				try {
					const verification = await jwtVerify(
						impersonationTokenSet.data.access_token,
						jwks,
						{
							issuer: configPublic.PUBLIC_OIDC_AUTHORITY.replace('/.well-known/openid-configuration', ''),
							audience: configPrivate.OIDC_RESOURCE ?? undefined
						}
					);
					verifiedPayload = verification.payload;
				} catch (verificationError) {
					console.warn('Impersonation token verification failed:', verificationError);
					cookies.delete(impersonationTokenCookieName, { path: '/' });
					return {
						nextTokenRefreshDue: tokenSet.expires_in
							? new Date(Date.now() + tokenSet.expires_in * 1000)
							: undefined,
						tokenSet,
						user: user ? { ...user, hasRole, OIDCRoleNames } : undefined,
						impersonation: impersonationContext
					};
				}

				if (!verifiedPayload.sub) {
					throw new Error('Impersonation token missing sub claim');
				}

				const dbUser = await db.user.findUnique({ where: { id: verifiedPayload.sub } });
				if (!dbUser) {
					throw new Error(`Impersonated user ${verifiedPayload.sub} not found in database`);
				}

				const impersonatedUser: OIDCUser = {
					sub: verifiedPayload.sub,
					email: dbUser.email ?? '',
					preferred_username: dbUser.preferred_username ?? undefined,
					family_name: dbUser.family_name ?? undefined,
					given_name: dbUser.given_name ?? undefined,
					locale: dbUser.locale ?? undefined,
					phone: dbUser.phone ?? undefined,
					// Spread custom JWT claims (roles, mfa, password, etc.)
					...verifiedPayload
				};

				// Extract actor information from the JWT token (if present)
				const actorInfo = verifiedPayload.act as Record<string, unknown> | undefined;

				// If actor claim is present, verify it matches the current user
				if (actorInfo && typeof actorInfo === 'object') {
					const actorSub = actorInfo.sub || actorInfo.subject;
					if (actorSub && actorSub !== user.sub) {
						console.warn(
							'Security: Actor mismatch in impersonation token. Aborting impersonation.',
							{ actorSub, currentUserSub: user.sub }
						);
						cookies.delete(impersonationTokenCookieName, { path: '/' });
						return {
							nextTokenRefreshDue: tokenSet.expires_in
								? new Date(Date.now() + tokenSet.expires_in * 1000)
								: undefined,
							tokenSet,
							user: user ? { ...user, hasRole, OIDCRoleNames } : undefined,
							impersonation: impersonationContext
						};
					}
				}

				impersonationContext = {
					isImpersonating: true,
					originalUser: user,
					impersonatedUser: impersonatedUser,
					actorInfo: actorInfo,
					startedAt: new Date()
				};

				// When impersonating, we use the impersonated user's details but keep original user as reference
				user = impersonatedUser;

				// Update role information for impersonated user
				let impersonatedOIDCRoleNames: (typeof oidcRoles)[number][] = [];
				if (impersonatedUser && configPrivate.OIDC_ROLE_CLAIM) {
					const impersonatedRolesRaw = impersonatedUser[configPrivate.OIDC_ROLE_CLAIM];
					impersonatedOIDCRoleNames = parseOidcRoles(impersonatedRolesRaw, oidcRoles);
				}

				// Override role functions for impersonated user
				const impersonatedHasRole = (role: (typeof impersonatedOIDCRoleNames)[number]) => {
					return impersonatedOIDCRoleNames.includes(role);
				};

				console.info('🎭 Impersonation active:', {
					originalUser: impersonationContext?.originalUser?.sub,
					impersonatedUser: impersonatedUser.sub,
					originalRoles: OIDCRoleNames,
					impersonatedRoles: impersonatedOIDCRoleNames
				});

				return {
					nextTokenRefreshDue: tokenSet.expires_in
						? new Date(Date.now() + tokenSet.expires_in * 1000)
						: undefined,
					tokenSet,
					user: user
						? { ...user, hasRole: impersonatedHasRole, OIDCRoleNames: impersonatedOIDCRoleNames }
						: undefined,
					impersonation: impersonationContext
				};
			}
		} catch (error) {
			console.warn('Failed to process impersonation token:', error);
			// Clear invalid impersonation cookie
			cookies.delete(impersonationTokenCookieName, { path: '/' });
		}
	}

	return {
		nextTokenRefreshDue: tokenSet.expires_in
			? new Date(Date.now() + tokenSet.expires_in * 1000)
			: undefined,
		tokenSet,
		user: user ? { ...user, hasRole, OIDCRoleNames } : undefined,
		impersonation: impersonationContext
	};
}

export type OIDC = Awaited<ReturnType<typeof oidc>>;