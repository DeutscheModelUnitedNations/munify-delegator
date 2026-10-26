import { db, schema } from '#api/db/db.js';
import { eq } from 'drizzle-orm';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { enum_ } from '#api/rumble.js';
import { oidcIdentityFields } from '#api/handlers/auth/oidcIdentityFields.js';
import { scanUserForDuplicatesInBackground } from '#api/handlers/possibleDuplicate/possibleDuplicates.js';
import {
	countConferenceParticipations,
	previewUser,
	removeParticipation,
	updateNewsletterPreferences,
	updateIdentity,
	updateProfile,
	upsertCallerRow
} from './userService';
import {
	assertCanImpersonate,
	assertCanManageUser,
	canImpersonate,
	assertNotImpersonating,
	assertCanPreviewUsers,
	assertCanUpdateNewsletterPreferences,
	deletableParticipation,
	registerUserAbilities,
	updatableUser
} from './userPermissions';
import {
	conferenceParticipantPubsub,
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	singleParticipantPubsub,
	userPubsub
} from '#api/pubsub.js';
import { OIDC } from '#api/services/OIDC.js';
import {
	impersonationConfigured,
	impersonationTokens
} from '#api/services/account/impersonation.js';
import { apiError } from '#api/services/errors/apiError.js';
import { m } from '#lib/paraglide/messages.js';

registerUserAbilities();

const genderEnum = enum_({ tsName: 'gender' });
// The column is an enum; the legacy arg was a loose string that Prisma rejected at runtime.
const foodPreferenceEnum = enum_({ tsName: 'foodPreference' });

export const UserRef = object({
	table: 'user',
	adjust: (t) => ({
		/**
		 * How many conferences this person actually took part in - registrations that never got a
		 * seat do not count, which is what makes this a useful "is this a returning participant"
		 * signal in the admin UI.
		 */
		conferenceParticipationsCount: t.field({
			type: 'Int',
			resolve: (user) => countConferenceParticipations(user.id)
		})
	})
});
query({ table: 'user' });

/**
 * Announces a changed profile. A completed or changed profile may now look like an account from
 * before, so it is compared with those again.
 */
function profileChanged(id: string) {
	userPubsub.updated(id);
	scanUserForDuplicatesInBackground(id);
}

/** The user with this id, as far as the caller may read it. */
const readableUser = async (ctx: ApiContext, id: string) =>
	(await ctx.abilities.user.filter('read')).merge({ where: { id } }).query.single;

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
			await removeParticipation(
				args.userId,
				args.conferenceId,
				await deletableParticipation(ctx, args.userId, args.conferenceId)
			);

			delegationMemberPubsub.removed();
			singleParticipantPubsub.removed();
			conferenceSupervisorPubsub.removed();
			conferenceParticipantPubsub.removed();

			return db.query.user
				.findFirst(query(await readableUser(ctx, args.userId)))
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * The my-account form and the user card's. rumble's scalars normalize what they can (names,
	 * the phone number as E.164, the address against the country's postal metadata); the same zod
	 * schema the form uses then judges the rest.
	 */
	updateUser: t.drizzleField({
		type: UserRef,
		args: {
			id: t.arg.id({ required: true }),
			givenName: t.arg({ type: 'PersonName', required: true }),
			familyName: t.arg({ type: 'PersonName', required: true }),
			birthday: t.arg({ type: 'Date', required: true }),
			phone: t.arg({ type: 'PhoneNumber', required: true }),
			address: t.arg({ type: 'AddressInput', required: true }),
			apartment: t.arg.string(),
			gender: t.arg({ type: genderEnum, required: true }),
			pronouns: t.arg.string(),
			foodPreference: t.arg({ type: foodPreferenceEnum, required: true }),
			emergencyContacts: t.arg.string({ required: true }),
			wantsToReceiveGeneralInformation: t.arg.boolean(),
			wantsJoinTeamInformation: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await updateProfile(args, await updatableUser(ctx, args.id));

			profileChanged(args.id);

			return db.query.user
				.findFirst(query(await readableUser(ctx, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Newsletter opt-ins, addressed by email rather than id. Opting out works without a session,
	 * because this backs the unsubscribe link in outgoing mail; opting in is consent, so only the
	 * account itself may give it. Answers `true` whether or not the address exists, so the
	 * unsubscribe page cannot be used to find out who has an account.
	 */
	updateUsersNewsletterPreferences: t.field({
		type: 'Boolean',
		args: {
			email: t.arg({ type: 'EmailAddress', required: true }),
			wantsToReceiveGeneralInformation: t.arg.boolean(),
			wantsJoinTeamInformation: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			assertCanUpdateNewsletterPreferences(ctx, args);
			const updated = await updateNewsletterPreferences(args);

			for (const id of updated) userPubsub.updated(id);

			return true;
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
			await assertCanManageUser(ctx, args.id);

			await db
				.update(schema.user)
				.set({ globalNotes: args.globalNotes })
				.where(eq(schema.user.id, args.id));

			userPubsub.updated(args.id);

			return db.query.user
				.findFirst(query(await readableUser(ctx, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	/** Name and birthday corrections by management; each field is optional and skipped when absent. */
	updateUsersIdentityInfo: t.drizzleField({
		type: UserRef,
		args: {
			id: t.arg.id({ required: true }),
			givenName: t.arg({ type: 'PersonName' }),
			familyName: t.arg({ type: 'PersonName' }),
			birthday: t.arg({ type: 'Date' })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanManageUser(ctx, args.id);

			await updateIdentity(args.id, args);

			profileChanged(args.id);

			return db.query.user
				.findFirst(query(await readableUser(ctx, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Acts as `targetUserId` from the next request on, until `stopImpersonation`, the session ends
	 * or the impersonation token expires.
	 *
	 * The provider issues the target's tokens through a token exchange that names the caller as
	 * their actor (`act`), and the OIDC library keeps them next to the caller's own session and
	 * checks them against it on every request. Whether the caller may still impersonate the target
	 * is checked on every request too (`impersonationHandle` in `hooks.server.ts`).
	 */
	startImpersonation: t.field({
		type: 'Boolean',
		args: { targetUserId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanImpersonate(ctx, args.targetUserId);
			const actor = ctx.mustBeLoggedIn();
			if (!impersonationConfigured()) {
				throw apiError('FORBIDDEN', m.impersonationNotConfigured());
			}
			const actorAccessToken = ctx.event.locals.oidc?.tokens.accessToken;
			if (!actorAccessToken) throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());

			try {
				const tokens = await impersonationTokens(actorAccessToken, args.targetUserId);
				await OIDC.startImpersonation(ctx.event, tokens);
			} catch (error) {
				console.warn({
					event: 'impersonation_start',
					outcome: 'failure',
					actor: actor.sub,
					subject: args.targetUserId,
					reason: error instanceof Error ? error.message : String(error)
				});
				throw apiError('CONFLICT', m.impersonationFailed());
			}
			console.info({
				event: 'impersonation_start',
				outcome: 'success',
				actor: actor.sub,
				subject: args.targetUserId
			});
			return true;
		}
	}),

	/** Puts the caller back in their own session. */
	stopImpersonation: t.field({
		type: 'Boolean',
		resolve: (_root, _args, ctx) => {
			const impersonator = ctx.oidc.impersonator;
			OIDC.stopImpersonation(ctx.event);
			if (impersonator) {
				console.info({
					event: 'impersonation_stop',
					actor: impersonator.sub,
					subject: ctx.oidc.user?.sub
				});
			}
			return true;
		}
	})
}));

const UpsertSelfResult = schemaBuilder.simpleObject('UpsertSelfResult', {
	fields: (t) => ({
		userNeedsAdditionalInfo: t.boolean(),
		userId: t.string()
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Creates or refreshes the caller's own row from their OIDC claims. Called right after login,
	 * which is the only moment the app learns about a new account.
	 *
	 * The claims come from the context rather than the userinfo endpoint: when access tokens are
	 * JWTs scoped to an API resource, fetching userinfo fails.
	 */
	upsertSelf: t.field({
		type: UpsertSelfResult,
		resolve: async (_root, _args, ctx) => {
			assertNotImpersonating(ctx);
			const result = await upsertCallerRow(ctx.mustBeLoggedIn());
			// An upsert on sign-in, so one notification on whichever row now holds the account.
			userPubsub.updated(result.userId);
			return result;
		}
	})
}));

const ImpersonationUser = schemaBuilder.simpleObject('ImpersonationUser', {
	fields: oidcIdentityFields
});

const ImpersonationStatus = schemaBuilder.simpleObject('ImpersonationStatus', {
	fields: (t) => ({
		isImpersonating: t.boolean(),
		originalUser: t.field({ type: ImpersonationUser, nullable: true }),
		impersonatedUser: t.field({ type: ImpersonationUser, nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/** Whether `startImpersonation` would let the caller act as this user, for showing the button. */
	canImpersonateUser: t.field({
		type: 'Boolean',
		args: { targetUserId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) =>
			impersonationConfigured() && (await canImpersonate(ctx, args.targetUserId))
	}),

	impersonationStatus: t.field({
		type: ImpersonationStatus,
		resolve: (_root, _args, ctx) => {
			const { user, impersonator } = ctx.oidc;
			if (!user || !impersonator) {
				return { isImpersonating: false, originalUser: null, impersonatedUser: null };
			}
			const identity = (person: typeof user | typeof impersonator) => ({
				sub: person.sub,
				email: person.email ?? '',
				preferred_username: person.preferred_username ?? null,
				given_name: person.given_name ?? null,
				family_name: person.family_name ?? null
			});
			return {
				isImpersonating: true,
				originalUser: identity(impersonator),
				impersonatedUser: identity(user)
			};
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
			await assertCanPreviewUsers(ctx);
			return previewUser(args.emailOrId);
		}
	})
}));
