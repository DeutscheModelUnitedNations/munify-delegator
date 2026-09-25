import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isSystemAdmin,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { enum_ } from '$api/rumble';
import { eq } from 'drizzle-orm';
import { userFormSchema } from '../../routes/(authenticated)/my-account/form-schema';
import { performTokenExchange } from '$api/services/OIDC';
import {
	impersonationTokenCookieName,
	type TokenCookieSchemaType
} from '$api/services/oidcContext';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/user.ts, plus the impersonation rules that lived in
// abilities/abilities.ts.
abilityBuilder.user.allow(['read', 'update', 'delete', 'impersonate']).when(systemAdmin);

// Users see and edit themselves.
abilityBuilder.user.allow(['read', 'update']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { id } } : undefined;
});

// Delegates see each other.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? { where: { delegationMemberships: { delegation: { members: { user: { id } } } } } }
		: undefined;
});

// Supervisors see the participants they supervise.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					OR: [
						{ delegationMemberships: { supervisors: { user: { id } } } },
						{ singleParticipant: { supervisors: { user: { id } } } }
					]
				}
			}
		: undefined;
});

// Participants see their own supervisors.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					conferenceSupervisor: {
						OR: [
							{ supervisedDelegationMembers: { user: { id } } },
							{ supervisedSingleParticipants: { user: { id } } }
						]
					}
				}
			}
		: undefined;
});

// Team members see each other.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? { where: { teamMember: { conference: { teamMembers: { user: { id } } } } } }
		: undefined;
});

// Supervisors see the other supervisors of the participants they share.
// Carried over from CASL with its original caveat that this is broader than needed.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					OR: [
						{
							conferenceSupervisor: {
								supervisedDelegationMembers: { supervisors: { user: { id } } }
							}
						},
						{
							conferenceSupervisor: {
								supervisedSingleParticipants: { supervisors: { user: { id } } }
							}
						}
					]
				}
			}
		: undefined;
});

// Project management and participant care may impersonate the participants of their own
// conferences. The resolver applies further checks on top, as it did before.
abilityBuilder.user.allow('impersonate').when((ctx) => {
	if (isSystemAdmin(ctx)) return 'allow';
	const id = userId(ctx);
	if (!id) return undefined;
	const team = { teamMembers: { user: { id }, role: { in: [...PARTICIPANT_CARE_ROLES] } } };
	return {
		where: {
			OR: [
				{ delegationMemberships: { delegation: { conference: team } } },
				{ singleParticipant: { conference: team } },
				{ conferenceSupervisor: { conference: team } }
			]
		}
	};
});

export const UserRef = object({ table: 'user' });
query({ table: 'user' });

schemaBuilder.mutationFields((t) => ({
	/**
	 * Removes every trace of a user's participation in one conference - delegation membership,
	 * single participant entry, supervisor entry and participant status - while leaving the user
	 * account itself alone. Each delete carries its own ability filter, so a caller who may remove
	 * one kind of participation but not another removes only what they are allowed to.
	 */
	unregisterParticipant: t.drizzleField({
		type: UserRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const scope = { conferenceId: args.conferenceId, userId: args.userId };

			await db.transaction(async (tx) => {
				const participant = await tx.query.user.findFirst({
					where: {
						id: args.userId,
						OR: [
							{ delegationMemberships: { conferenceId: args.conferenceId } },
							{ singleParticipant: { conferenceId: args.conferenceId } },
							{ conferenceSupervisor: { conferenceId: args.conferenceId } }
						]
					},
					columns: { id: true }
				});

				if (!participant) {
					throw new GraphQLError('User not found');
				}

				// Each delete carries its own ability filter, merged with the conference/user scope, so
				// a caller who may remove one kind of participation but not another removes only what
				// they are allowed to.
				await tx
					.delete(schema.delegationMember)
					.where(ctx.abilities.delegationMember.filter('delete').merge({ where: scope }).sql.where);

				await tx
					.delete(schema.singleParticipant)
					.where(
						ctx.abilities.singleParticipant.filter('delete').merge({ where: scope }).sql.where
					);

				await tx
					.delete(schema.conferenceSupervisor)
					.where(
						ctx.abilities.conferenceSupervisor.filter('delete').merge({ where: scope }).sql.where
					);

				await tx
					.delete(schema.conferenceParticipantStatus)
					.where(
						ctx.abilities.conferenceParticipantStatus.filter('delete').merge({ where: scope }).sql
							.where
					);
			});

			return db.query.user
				.findFirst(
					query(
						ctx.abilities.user.filter('read').merge({ where: { id: args.userId } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

const genderEnum = enum_({ tsName: 'gender' });
// The column is an enum; the legacy arg was a loose string that Prisma rejected at runtime.
const foodPreferenceEnum = enum_({ tsName: 'foodPreference' });

schemaBuilder.mutationFields((t) => ({
	/** The my-account form. Validated with the same zod schema the form itself uses. */
	updateUser: t.drizzleField({
		type: UserRef,
		args: {
			id: t.arg.id({ required: true }),
			givenName: t.arg.string({ required: true }),
			familyName: t.arg.string({ required: true }),
			birthday: t.arg({ type: 'DateTime', required: true }),
			phone: t.arg.string({ required: true }),
			street: t.arg.string({ required: true }),
			apartment: t.arg.string(),
			zip: t.arg.string({ required: true }),
			city: t.arg.string({ required: true }),
			country: t.arg.string({ required: true }),
			gender: t.arg({ type: genderEnum, required: true }),
			pronouns: t.arg.string(),
			foodPreference: t.arg({ type: foodPreferenceEnum, required: true }),
			emergencyContacts: t.arg.string({ required: true }),
			wantsToReceiveGeneralInformation: t.arg.boolean(),
			wantsJoinTeamInformation: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			userFormSchema.parse({
				given_name: args.givenName,
				family_name: args.familyName,
				birthday: args.birthday,
				phone: args.phone,
				street: args.street,
				apartment: args.apartment,
				zip: args.zip,
				city: args.city,
				country: args.country,
				gender: args.gender,
				pronouns: args.pronouns,
				foodPreference: args.foodPreference,
				emergencyContacts: args.emergencyContacts,
				wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation,
				wantsJoinTeamInformation: args.wantsJoinTeamInformation
			});

			await db
				.update(schema.user)
				.set({
					givenName: args.givenName,
					familyName: args.familyName,
					birthday: args.birthday,
					phone: args.phone,
					street: args.street,
					apartment: args.apartment ?? undefined,
					zip: args.zip,
					city: args.city,
					country: args.country,
					gender: args.gender,
					pronouns: args.pronouns ?? undefined,
					foodPreference: args.foodPreference,
					emergencyContacts: args.emergencyContacts,
					wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation ?? undefined,
					wantsJoinTeamInformation: args.wantsJoinTeamInformation ?? undefined
				})
				.where(ctx.abilities.user.filter('update').merge({ where: { id: args.id } }).sql.where);

			return db.query.user
				.findFirst(
					query(ctx.abilities.user.filter('read').merge({ where: { id: args.id } }).query.single)
				)
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Newsletter opt-ins, addressed by email rather than id and deliberately unauthenticated:
	 * this backs the unsubscribe link in outgoing mail, where the recipient has no session.
	 */
	updateUsersNewsletterPreferences: t.drizzleField({
		type: UserRef,
		args: {
			email: t.arg.string({ required: true }),
			wantsToReceiveGeneralInformation: t.arg.boolean(),
			wantsJoinTeamInformation: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.user)
				.set({
					wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation ?? undefined,
					wantsJoinTeamInformation: args.wantsJoinTeamInformation ?? undefined
				})
				.where(eq(schema.user.email, args.email));

			return db.query.user
				.findFirst(
					query(
						ctx.abilities.user.filter('read').merge({ where: { email: args.email } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Participant care notes, kept separate so they are never part of a self-service update. */
	updateUsersGlobalNotes: t.drizzleField({
		type: UserRef,
		args: {
			id: t.arg.id({ required: true }),
			globalNotes: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.user)
				.set({ globalNotes: args.globalNotes })
				.where(ctx.abilities.user.filter('update').merge({ where: { id: args.id } }).sql.where);

			return db.query.user
				.findFirst(
					query(ctx.abilities.user.filter('read').merge({ where: { id: args.id } }).query.single)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Name and birthday corrections by management; each field is optional and skipped when absent. */
	updateUsersIdentityInfo: t.drizzleField({
		type: UserRef,
		args: {
			id: t.arg.id({ required: true }),
			givenName: t.arg.string(),
			familyName: t.arg.string(),
			birthday: t.arg({ type: 'DateTime' })
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.user)
				.set({
					givenName: args.givenName ?? undefined,
					familyName: args.familyName ?? undefined,
					birthday: args.birthday ?? undefined
				})
				.where(ctx.abilities.user.filter('update').merge({ where: { id: args.id } }).sql.where);

			return db.query.user
				.findFirst(
					query(ctx.abilities.user.filter('read').merge({ where: { id: args.id } }).query.single)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteUser: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.user)
				.where(ctx.abilities.user.filter('delete').merge({ where: { id: args.id } }).sql.where)
				.returning({ id: schema.user.id });
			if (deleted.length === 0) {
				throw new GraphQLError('User not found, or not yours to delete');
			}
			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Issues an impersonation token for another user and stores it in a cookie, so participant
	 * care can see the app exactly as that person does.
	 *
	 * Who may impersonate whom is expressed by the `impersonate` ability on `user`: system admins
	 * without restriction, project management and participant care only for participants of their
	 * own conferences. Filtering the target through that ability answers both questions at once -
	 * the legacy resolver asked them separately.
	 */
	startImpersonation: t.field({
		type: 'Boolean',
		args: {
			targetUserId: t.arg.id({ required: true }),
			scope: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			const actor = ctx.mustBeLoggedIn();

			const accessToken = ctx.oidc.tokenSet?.access_token;
			if (!accessToken) {
				throw new GraphQLError('No access token available');
			}
			if (ctx.oidc.impersonation?.isImpersonating) {
				throw new GraphQLError(
					'Already impersonating a user. Please stop current impersonation first.'
				);
			}

			const target = await db.query.user.findFirst({ where: { id: args.targetUserId } });
			if (!target) {
				throw new GraphQLError('Target user not found');
			}

			const permitted = await db.query.user.findFirst(
				ctx.abilities.user.filter('impersonate').merge({ where: { id: args.targetUserId } }).query
					.single
			);
			if (!permitted) {
				throw new GraphQLError('No permission to impersonate this specific user');
			}

			let tokens;
			try {
				tokens = await performTokenExchange(
					accessToken,
					args.targetUserId,
					args.scope ?? undefined
				);
			} catch (error) {
				console.error('Impersonation failed:', error);
				throw new GraphQLError(
					`Failed to start impersonation: ${error instanceof Error ? error.message : 'Unknown error'}`,
					{ originalError: error instanceof Error ? error : undefined }
				);
			}

			const cookieValue: TokenCookieSchemaType = {
				access_token: tokens.access_token,
				expires_in: tokens.expires_in,
				id_token: tokens.id_token,
				refresh_token: tokens.refresh_token,
				scope: tokens.scope,
				session_state: tokens.session_state,
				token_type: tokens.token_type
			};

			if (!ctx.event?.cookies) {
				throw new GraphQLError('Unable to set impersonation cookie: event.cookies unavailable');
			}
			ctx.event.cookies.set(impersonationTokenCookieName, JSON.stringify(cookieValue), {
				path: '/',
				httpOnly: true,
				// Left permissive so impersonation works over plain http in development.
				secure: false,
				sameSite: 'lax',
				maxAge: tokens.expires_in ?? 3600
			});

			console.log(
				`User ${actor.preferred_username} (${actor.sub}) started impersonating user ${target.preferredUsername} (${target.id})`
			);
			return true;
		}
	})
}));

const ImpersonationUser = schemaBuilder.simpleObject('ImpersonationUser', {
	fields: (t) => ({
		sub: t.string(),
		email: t.string(),
		preferred_username: t.string({ nullable: true }),
		family_name: t.string({ nullable: true }),
		given_name: t.string({ nullable: true })
	})
});

const ImpersonationStatus = schemaBuilder.simpleObject('ImpersonationStatus', {
	fields: (t) => ({
		isImpersonating: t.boolean(),
		originalUser: t.field({ type: ImpersonationUser, nullable: true }),
		impersonatedUser: t.field({ type: ImpersonationUser, nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	impersonationStatus: t.field({
		type: ImpersonationStatus,
		resolve: (_root, _args, ctx) => {
			const impersonation = ctx.oidc.impersonation;
			if (!impersonation) {
				return { isImpersonating: false, originalUser: null, impersonatedUser: null };
			}

			const asImpersonationUser = (user: typeof impersonation.originalUser) =>
				user
					? {
							sub: user.sub,
							email: user.email,
							preferred_username: user.preferred_username ?? null,
							family_name: user.family_name ?? null,
							given_name: user.given_name ?? null
						}
					: null;

			return {
				isImpersonating: impersonation.isImpersonating,
				originalUser: asImpersonationUser(impersonation.originalUser),
				impersonatedUser: asImpersonationUser(impersonation.impersonatedUser)
			};
		}
	}),

	/**
	 * The users the caller may impersonate. Scoping is delegated to the `impersonate` ability, so
	 * this is the same rule `startImpersonation` enforces - listing and acting cannot drift apart.
	 */
	impersonatableUsers: t.drizzleField({
		type: [UserRef],
		resolve: async (query, _root, _args, ctx) => {
			ctx.mustBeLoggedIn();

			return db.query.user.findMany(
				query({
					...ctx.abilities.user.filter('impersonate').query.many,
					orderBy: { preferredUsername: 'asc' }
				})
			);
		}
	})
}));

const UserPreview = schemaBuilder.simpleObject('UserPreview', {
	fields: (t) => ({
		id: t.id(),
		email: t.string(),
		given_name: t.string({ nullable: true }),
		family_name: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * Looks a user up by id or email so management can add them to something.
	 *
	 * Not ability-filtered on the target - the whole point is to find somebody the caller has no
	 * relationship with yet - so the check is on the caller instead: participant care, project
	 * management, or admin. Only the four fields below are exposed.
	 */
	previewUserByIdOrEmail: t.field({
		type: UserPreview,
		args: { emailOrId: t.arg.string({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const caller = ctx.mustBeLoggedIn();

			if (!isSystemAdmin(ctx)) {
				const privileged = await db.query.teamMember.findFirst({
					where: { userId: caller.sub, role: { in: [...PARTICIPANT_CARE_ROLES] } }
				});
				if (!privileged) {
					throw new GraphQLError(
						'You are not allowed to preview users. You need to be a team member with the role PARTICIPANT_CARE or PROJECT_MANAGEMENT or an admin.'
					);
				}
			}

			const found = await db.query.user
				.findFirst({ where: { OR: [{ id: args.emailOrId }, { email: args.emailOrId }] } })
				.then(assertFindFirstExists);

			return {
				id: found.id,
				email: found.email,
				given_name: found.givenName ?? null,
				family_name: found.familyName ?? null
			};
		}
	})
}));
