import { builder } from '../builder';
import { performTokenExchange } from '$api/services/OIDC';
import { impersonationTokenCookieName, type TokenCookieSchemaType } from '$api/context/oidc';
import { GraphQLError } from 'graphql';
import { db } from '$db/db';

builder.queryFields((t) => ({
	impersonationStatus: t.field({
		type: t.builder.simpleObject('ImpersonationStatus', {
			fields: (t) => ({
				isImpersonating: t.boolean(),
				originalUser: t.field({
					type: t.builder.simpleObject('ImpersonationUser', {
						fields: (t) => ({
							sub: t.string(),
							email: t.string(),
							preferred_username: t.string(),
							family_name: t.string(),
							given_name: t.string()
						})
					}),
					nullable: true
				}),
				impersonatedUser: t.field({
					type: t.builder.simpleObject('ImpersonatedUser', {
						fields: (t) => ({
							sub: t.string(),
							email: t.string(),
							preferred_username: t.string(),
							family_name: t.string(),
							given_name: t.string()
						})
					}),
					nullable: true
				})
			})
		}),
		resolve: (root, args, ctx) => {
			const { impersonation } = ctx.oidc;

			if (!impersonation) {
				return {
					isImpersonating: false,
					originalUser: null,
					impersonatedUser: null
				};
			}

			return {
				isImpersonating: impersonation.isImpersonating,
				originalUser: impersonation.originalUser
					? {
							sub: impersonation.originalUser.sub,
							email: impersonation.originalUser.email,
							preferred_username: impersonation.originalUser.preferred_username,
							family_name: impersonation.originalUser.family_name,
							given_name: impersonation.originalUser.given_name
						}
					: null,
				impersonatedUser: impersonation.impersonatedUser
					? {
							sub: impersonation.impersonatedUser.sub,
							email: impersonation.impersonatedUser.email,
							preferred_username: impersonation.impersonatedUser.preferred_username,
							family_name: impersonation.impersonatedUser.family_name,
							given_name: impersonation.impersonatedUser.given_name
						}
					: null
			};
		}
	}),

	impersonatableUsers: t.prismaField({
		type: ['User'],
		resolve: async (query, root, args, ctx) => {
			// Check if user has impersonation permissions
			const user = ctx.oidc.user;
			if (!user) {
				throw new GraphQLError('Not authenticated');
			}

			// Only admins, project management, and participant care can impersonate
			const canImpersonate =
				user.hasRole('admin') || ctx.permissions.abilities.can('impersonate', 'User' as any);

			if (!canImpersonate) {
				throw new GraphQLError('No permission to impersonate users');
			}

			// For admins: return all users
			if (user.hasRole('admin')) {
				return db.user.findMany({
					...query,
					orderBy: { preferred_username: 'asc' }
				});
			}

			// For project management and participant care: return users from their conferences
			return db.user.findMany({
				...query,
				where: {
					OR: [
						// Delegation members from conferences where user is team member
						{
							delegationMemberships: {
								some: {
									delegation: {
										conference: {
											teamMembers: {
												some: {
													user: { id: user.sub },
													role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
												}
											}
										}
									}
								}
							}
						},
						// Single participants from conferences where user is team member
						{
							singleParticipant: {
								some: {
									conference: {
										teamMembers: {
											some: {
												user: { id: user.sub },
												role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
											}
										}
									}
								}
							}
						}
					]
				},
				orderBy: { preferred_username: 'asc' }
			});
		}
	})
}));

builder.mutationFields((t) => ({
	startImpersonation: t.field({
		type: 'Boolean',
		args: {
			targetUserId: t.arg.string({ required: true }),
			scope: t.arg.string({ required: false })
		},
		resolve: async (root, args, ctx, info) => {
			const user = ctx.oidc.user;
			if (!user) {
				throw new GraphQLError('Not authenticated');
			}

			if (!ctx.oidc.tokenSet?.access_token) {
				throw new GraphQLError('No access token available');
			}

			// Check if already impersonating
			if (ctx.oidc.impersonation?.isImpersonating) {
				throw new GraphQLError(
					'Already impersonating a user. Please stop current impersonation first.'
				);
			}

			// Check permissions
			const canImpersonate =
				user.hasRole('admin') || ctx.permissions.abilities.can('impersonate', 'User' as any);

			if (!canImpersonate) {
				throw new GraphQLError('No permission to impersonate users');
			}

			// Verify target user exists
			const targetUser = await db.user.findUnique({
				where: { id: args.targetUserId }
			});

			if (!targetUser) {
				throw new GraphQLError('Target user not found');
			}

			// For non-admins, verify they can impersonate this specific user
			if (!user.hasRole('admin')) {
				const canImpersonateTarget = await db.user.findFirst({
					where: {
						id: args.targetUserId,
						OR: [
							// Delegation members from conferences where user is team member
							{
								delegationMemberships: {
									some: {
										delegation: {
											conference: {
												teamMembers: {
													some: {
														user: { id: user.sub },
														role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
													}
												}
											}
										}
									}
								}
							},
							// Single participants from conferences where user is team member
							{
								singleParticipant: {
									some: {
										conference: {
											teamMembers: {
												some: {
													user: { id: user.sub },
													role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
												}
											}
										}
									}
								}
							}
						]
					}
				});

				if (!canImpersonateTarget) {
					throw new GraphQLError('No permission to impersonate this specific user');
				}
			}

			try {
				// Use the same scopes as the original user's token for consistency
				const originalScopes = ctx.oidc.tokenSet.scope || 'openid profile email';

				// Perform token exchange
				const impersonationTokens = await performTokenExchange(
					ctx.oidc.tokenSet.access_token,
					args.targetUserId,
					args.scope || originalScopes
				);

				// Store impersonation tokens in cookie
				const impersonationCookieValue: TokenCookieSchemaType = {
					access_token: impersonationTokens.access_token,
					expires_in: impersonationTokens.expires_in,
					id_token: impersonationTokens.id_token,
					refresh_token: impersonationTokens.refresh_token,
					scope: impersonationTokens.scope,
					session_state: impersonationTokens.session_state,
					token_type: impersonationTokens.token_type
				};

				const event = ctx.event;
				console.info('🍪 Setting impersonation cookie:', {
					hasEvent: !!event,
					hasCookies: !!event?.cookies,
					cookieValue: JSON.stringify(impersonationCookieValue)
				});

				if (event?.cookies) {
					event.cookies.set(
						impersonationTokenCookieName,
						JSON.stringify(impersonationCookieValue),
						{
							path: '/',
							httpOnly: true,
							secure: false, // Allow in development
							sameSite: 'lax',
							maxAge: impersonationTokens.expires_in ? impersonationTokens.expires_in : 3600 // 1 hour default
						}
					);
					console.info('🍪 Cookie set successfully');
				} else {
					throw new GraphQLError('Unable to set impersonation cookie: event.cookies unavailable');
				}

				console.log(
					`User ${user.preferred_username} (${user.sub}) started impersonating user ${targetUser.preferred_username} (${targetUser.id})`
				);

				return true;
			} catch (error) {
				console.error('Impersonation failed:', error);
				throw new GraphQLError(
					`Failed to start impersonation: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}
	}),

	stopImpersonation: t.field({
		type: 'Boolean',
		resolve: async (root, args, ctx) => {
			if (!ctx.oidc.impersonation?.isImpersonating) {
				throw new GraphQLError('Not currently impersonating');
			}

			const event = ctx.event;
			if (event?.cookies) {
				event.cookies.delete(impersonationTokenCookieName, { path: '/' });
			}

			const originalUser = ctx.oidc.impersonation?.originalUser;
			const impersonatedUser = ctx.oidc.impersonation?.impersonatedUser;

			if (originalUser && impersonatedUser) {
				console.log(
					`User ${originalUser.preferred_username} (${originalUser.sub}) stopped impersonating user ${impersonatedUser.preferred_username} (${impersonatedUser.sub})`
				);
			}

			return true;
		}
	})
}));
