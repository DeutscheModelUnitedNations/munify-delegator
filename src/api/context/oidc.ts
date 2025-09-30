import { z } from 'zod';
import { oidcRoles, refresh, validateTokens, type OIDCUser } from '$api/services/OIDC';
import { configPrivate } from '$config/private';
import type { RequestEvent } from '@sveltejs/kit';
import { GraphQLError } from 'graphql';

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

	const tokenSet = tokenSetRaw.data;

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
		console.warn(`Failed to retrieve user info from tokens`, error);
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
				maxAge: tokenSet.expires_in ? tokenSet.expires_in : undefined
			});
		} catch (error) {
			console.warn(`Failed to refresh tokens`, error);
			return { nextTokenRefreshDue: undefined, tokenSet: undefined, user: undefined };
		}
	}

	const OIDCRoleNames: (typeof oidcRoles)[number][] = [];

	if (user && configPrivate.OIDC_ROLE_CLAIM) {
		const rolesRaw = user[configPrivate.OIDC_ROLE_CLAIM]!;
		if (rolesRaw) {
			const roleNames = Object.keys(rolesRaw);
			OIDCRoleNames.push(...(roleNames as any));
		}
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
				const impersonatedUser = await validateTokens({
					access_token: impersonationTokenSet.data.access_token,
					id_token: impersonationTokenSet.data.id_token
				});

				// Extract actor information from the JWT token
				const actorInfo = (impersonatedUser as any).act;

				// Security: verify the impersonation token was actually issued for the currently authenticated actor (original user)
				const actorSub =
					actorInfo && typeof actorInfo === 'object'
						? actorInfo.sub || actorInfo.subject || (actorInfo as any)['urn:zitadel:act:sub']
						: undefined;

				if (!actorSub) {
					console.warn(
						'Security: Impersonation token missing actor (act.sub) claim. Aborting impersonation.'
					);
					// Defensive: clear cookie so we do not repeatedly parse invalid token
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

				if (actorSub !== user.sub) {
					console.warn('Security: Actor mismatch in impersonation token. Aborting impersonation.', {
						actorSub,
						currentUserSub: user.sub
					});
					// Clear cookie to prevent repeated attempts with a mismatched token
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
				const impersonatedOIDCRoleNames: (typeof oidcRoles)[number][] = [];
				if (impersonatedUser && configPrivate.OIDC_ROLE_CLAIM) {
					const impersonatedRolesRaw = impersonatedUser[configPrivate.OIDC_ROLE_CLAIM]!;
					if (impersonatedRolesRaw) {
						const impersonatedRoleNames = Object.keys(impersonatedRolesRaw);
						impersonatedOIDCRoleNames.push(...(impersonatedRoleNames as any));
					}
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
