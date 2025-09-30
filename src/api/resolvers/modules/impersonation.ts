import { builder } from '../builder';
import { performTokenExchange } from '$api/services/OIDC';
import { impersonationTokenCookieName, type TokenCookieSchemaType } from '$api/context/oidc';
import { GraphQLError } from 'graphql';
import { db } from '$db/db';
import { dev } from '$app/environment';
import { TeamRole } from '@prisma/client';

const ALLOWED_IMPERSONATION_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access']);

function getImpersonatableUserOrClause(userId: string) {
	return [
		// Delegation members from conferences where user is team member
		{
			delegationMemberships: {
				some: {
					delegation: {
						conference: {
							teamMembers: {
								some: {
									user: { id: userId },
									role: { in: [TeamRole.PROJECT_MANAGEMENT, TeamRole.PARTICIPANT_CARE] }
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
								user: { id: userId },
								role: { in: [TeamRole.PROJECT_MANAGEMENT, TeamRole.PARTICIPANT_CARE] }
							}
						}
					}
				}
			}
		}
	];
}

builder.queryFields((t) => ({
	impersonationStatus: t.field({
		type: t.builder.simpleObject('ImpersonationStatus', {
			fields: (t) => ({
				isImpersonating: t.boolean(),
				originalUser: t.field({
					type: t.builder.simpleObject('ImpersonationUser', {
						fields: (t) => ({
							sub: t.string(),
							email: t.string({ nullable: true }),
							preferred_username: t.string({ nullable: true }),
							family_name: t.string({ nullable: true }),
							given_name: t.string({ nullable: true })
						})
					}),
					nullable: true
				}),
				impersonatedUser: t.field({
					type: t.builder.simpleObject('ImpersonatedUser', {
						fields: (t) => ({
							sub: t.string(),
							email: t.string({ nullable: true }),
							preferred_username: t.string({ nullable: true }),
							family_name: t.string({ nullable: true }),
							given_name: t.string({ nullable: true })
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
		args: {
			skip: t.arg.int({ required: false }),
			take: t.arg.int({ required: false })
		},
		resolve: async (query, root, args, ctx) => {
			// Check if user has impersonation permissions
			const user = ctx.oidc.user;
			if (!user) {
				throw new GraphQLError('Not authenticated');
			}

			const canImpersonate =
				user.hasRole('admin') || ctx.permissions.abilities.can('impersonate', 'User');

			if (!canImpersonate) {
				throw new GraphQLError('No permission to impersonate users');
			}

			// For admins: return all users
			if (user.hasRole('admin')) {
				return db.user.findMany({
					...query,
					skip: args.skip ?? undefined,
					take: args.take ?? undefined,
					where: { id: { not: user.sub } },
					orderBy: { preferred_username: 'asc' }
				});
			}

			// For project management and participant care: return users from their conferences
			return db.user.findMany({
				...query,
				skip: args.skip ?? undefined,
				take: args.take ?? undefined,
				where: {
					id: { not: user.sub },
					OR: getImpersonatableUserOrClause(user.sub)
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
			if (ctx.oidc.impersonation.isImpersonating) {
				throw new GraphQLError(
					'Already impersonating a user. Please stop current impersonation first.'
				);
			}

			// Check permissions
			const canImpersonate =
				user.hasRole('admin') || ctx.permissions.abilities.can('impersonate', 'User');

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

			if (args.targetUserId === user.sub) {
				throw new GraphQLError('Cannot impersonate yourself');
			}

			// For non-admins, verify they can impersonate this specific user
			if (!user.hasRole('admin')) {
				const canImpersonateTarget = await db.user.findFirst({
					where: {
						id: args.targetUserId,
						OR: getImpersonatableUserOrClause(user.sub)
					}
				});

				if (!canImpersonateTarget) {
					throw new GraphQLError('No permission to impersonate this specific user');
				}
			}

			try {
				// Use the same scopes as the original user's token for consistency
				const originalScopes = ctx.oidc.tokenSet.scope || 'openid profile email';
				const requested = (args.scope || originalScopes).split(/\s+/).filter(Boolean);
				const sanitizedScopes =
					requested.filter((s) => ALLOWED_IMPERSONATION_SCOPES.has(s)).join(' ') ||
					'openid profile email';

				// Perform token exchange
				const impersonationTokens = await performTokenExchange(
					ctx.oidc.tokenSet.access_token,
					args.targetUserId,
					sanitizedScopes
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
				} else {
					console.error('🍪 Failed to set cookie - no event.cookies available');
				}

				console.info({
					event: 'impersonation_started',
					actor: {
						id: user.sub,
						email: user.email
					},
					target: {
						id: targetUser.id,
						email: targetUser.email
					}
				});

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
				event.cookies.delete(impersonationTokenCookieName, {
					path: '/',
					secure: !dev,
					sameSite: dev ? 'lax' : 'strict'
				});
			}

			const originalUser = ctx.oidc.impersonation?.originalUser;
			const impersonatedUser = ctx.oidc.impersonation?.impersonatedUser;

			if (originalUser && impersonatedUser) {
				console.info({
					event: 'impersonation_stopped',
					actor: {
						id: originalUser.sub,
						username: originalUser.preferred_username
					},
					target: {
						id: impersonatedUser.sub,
						username: impersonatedUser.preferred_username
					}
				});
			}

			return true;
		}
	})
}));
