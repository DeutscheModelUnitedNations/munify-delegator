import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { enum_ } from '#api/rumble';
import { oidcIdentityFields } from '#api/handlers/auth/oidcIdentityFields';
import { scanUserForDuplicatesInBackground } from '#api/handlers/possibleDuplicate/possibleDuplicates';
import {
	countConferenceParticipations,
	removeParticipation,
	updateNewsletterPreferences,
	updateIdentity,
	updateProfile
} from './userService';
import {
	assertCanImpersonate,
	assertCanManageUser,
	canImpersonate,
	assertCanUpdateNewsletterPreferences,
	deletableParticipation,
	registerUserAbilities
} from './userPermissions';
import {
	conferenceParticipantPubsub,
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	singleParticipantPubsub,
	userPubsub
} from '#api/pubsub';
import { OIDC } from '#api/services/oidc/OIDC';
import { impersonationConfigured, impersonationTokens } from '#api/services/account/impersonation';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { whereAllowed, queryAllowed } from '#api/services/authHelper/utils';
import { logger } from '#lib/logger';

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
/** The user as the caller may read them, for re-reading the row a mutation wrote. */
function allowedUser({ ctx, id }: { ctx: ApiContext; id: string }) {
	return queryAllowed({ ability: ctx.abilities.user, id });
}

function profileChanged(id: string) {
	userPubsub.updated(id);
	scanUserForDuplicatesInBackground(id);
}

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
			await removeParticipation({
				userId: args.userId,
				conferenceId: args.conferenceId,
				deletable: await deletableParticipation({
					ctx,
					userId: args.userId,
					conferenceId: args.conferenceId
				})
			});

			delegationMemberPubsub.removed();
			singleParticipantPubsub.removed();
			conferenceSupervisorPubsub.removed();
			conferenceParticipantPubsub.removed();

			return db.query.user
				.findFirst(query(await allowedUser({ ctx, id: args.userId })))
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
			await updateProfile({
				args,
				updatable: await whereAllowed({ ctx, table: 'user', action: 'update', id: args.id })
			});

			profileChanged(args.id);

			return db.query.user
				.findFirst(query(await allowedUser({ ctx, id: args.id })))
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
			assertCanUpdateNewsletterPreferences({ ctx, args });
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
			await assertCanManageUser({ ctx, id: args.id });

			await db
				.update(schema.user)
				.set({ globalNotes: args.globalNotes })
				.where(whereRows({ table: schema.user, filter: { id: args.id } }));

			userPubsub.updated(args.id);

			return db.query.user
				.findFirst(query(await allowedUser({ ctx, id: args.id })))
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
			await assertCanManageUser({ ctx, id: args.id });

			await updateIdentity({ id: args.id, args });

			profileChanged(args.id);

			return db.query.user
				.findFirst(query(await allowedUser({ ctx, id: args.id })))
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
	 * is checked on every request too (`impersonationHandle` in `userPermissions.ts`).
	 */
	startImpersonation: t.field({
		type: 'Boolean',
		args: { targetUserId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanImpersonate({ ctx, targetId: args.targetUserId });
			const actor = ctx.mustBeLoggedIn();
			if (!impersonationConfigured()) {
				throw apiError({ code: 'FORBIDDEN', message: m.impersonationNotConfigured() });
			}
			const actorAccessToken = ctx.event.locals.oidc?.tokens.accessToken;
			if (!actorAccessToken)
				throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });

			try {
				const tokens = await impersonationTokens({ actorAccessToken, userId: args.targetUserId });
				await OIDC.startImpersonation(ctx.event, tokens);
			} catch (error) {
				logger.warn('Impersonation failed to start', {
					actor: actor.sub,
					subject: args.targetUserId,
					reason: error instanceof Error ? error.message : String(error)
				});
				throw apiError({ code: 'CONFLICT', message: m.impersonationFailed() });
			}
			logger.info('Impersonation started', {
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
				logger.info('Impersonation stopped', {
					actor: impersonator.sub,
					subject: ctx.oidc.user?.sub
				});
			}
			return true;
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
			impersonationConfigured() && (await canImpersonate({ ctx, targetId: args.targetUserId }))
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
