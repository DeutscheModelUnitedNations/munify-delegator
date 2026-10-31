import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { oidcIdentityFields } from '#api/handlers/auth/oidcIdentityFields';
import {
	countConferenceParticipations,
	profileArgsSchema,
	removeParticipation,
	setGlobalNotes,
	updateNewsletterPreferences,
	updateIdentity,
	updateProfile
} from './userService';
import {
	assertCanImpersonate,
	assertCanManageUser,
	assertCanUpdateNewsletterPreferences,
	assertCanUpdateUser,
	canImpersonate,
	deletableParticipation,
	registerUserAbilities
} from './userPermissions';
import { impersonationConfigured, startImpersonation, stopImpersonation } from './impersonation';

registerUserAbilities();

const genderEnum = enum_({ tsName: 'gender' });
const foodPreferenceEnum = enum_({ tsName: 'foodPreference' });

export const UserRef = object({
	table: 'user',
	adjust: (t) => ({
		conferenceParticipationsCount: t.field({
			description:
				'How many conferences this person actually took part in - registrations that never got a seat do not count, which is what makes this a useful "is this a returning participant" signal in the admin UI.',
			type: 'Int',
			resolve: (user) => countConferenceParticipations(user.id)
		})
	})
});
query({ table: 'user' });

/** The user as the caller may read them, for re-reading the row a mutation wrote. */
async function allowedUser({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.user.filter('read')).merge({ where: { id } }).query.single;
}

schemaBuilder.mutationFields((t) => ({
	unregisterParticipant: t.drizzleField({
		description:
			"Removes every trace of a user's participation in one conference - delegation membership, single participant entry, supervisor entry and participant status - while leaving the user account itself alone. Each delete carries its own ability filter, so a caller who may remove one kind of participation but not another removes only what they are allowed to. NOT_FOUND when the user takes no part in the conference.",
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

			return db.query.user
				.findFirst(query(await allowedUser({ ctx, id: args.userId })))
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.mutationFields((t) => {
	/** Name and birthday, which a profile update and management's corrections both take. */
	const identityArgs = () => ({
		givenName: t.arg({ type: 'PersonName' }),
		familyName: t.arg({ type: 'PersonName' }),
		birthday: t.arg({ type: 'Date' })
	});

	return {
		updateUser: t.drizzleField({
			description:
				"Changes the given fields of a profile; the others stay as they are. `null` clears the apartment or the pronouns, and leaves every field a profile always has as it is. The fields are judged by the rules the profile forms use (INVALID_INPUT). Everybody changes their own profile, a system admin anybody's; NOT_FOUND otherwise.",
			type: UserRef,
			args: t.validate(
				{
					id: t.arg.id({ required: true }),
					...identityArgs(),
					phone: t.arg({ type: 'PhoneNumber' }),
					address: t.arg({ type: 'AddressInput' }),
					apartment: t.arg.string(),
					gender: t.arg({ type: genderEnum }),
					pronouns: t.arg.string(),
					foodPreference: t.arg({ type: foodPreferenceEnum }),
					emergencyContacts: t.arg.string(),
					wantsToReceiveGeneralInformation: t.arg.boolean(),
					wantsJoinTeamInformation: t.arg.boolean()
				},
				profileArgsSchema
			),
			resolve: async (query, _root, profile, ctx) => {
				await assertCanUpdateUser({ ctx, id: profile.id });
				await updateProfile(profile);

				return db.query.user
					.findFirst(query(await allowedUser({ ctx, id: profile.id })))
					.then(assertFindFirstExists);
			}
		}),

		updateUsersNewsletterPreferences: t.field({
			description:
				'Newsletter opt-ins, addressed by email rather than id. Opting out works without a session, because this backs the unsubscribe link in outgoing mail; opting in is consent, so only the account itself may give it. Answers `true` whether or not the address exists, so the unsubscribe page cannot be used to find out who has an account.',
			type: 'Boolean',
			args: {
				email: t.arg({ type: 'EmailAddress', required: true }),
				wantsToReceiveGeneralInformation: t.arg.boolean(),
				wantsJoinTeamInformation: t.arg.boolean()
			},
			resolve: async (_root, args, ctx) => {
				assertCanUpdateNewsletterPreferences({ ctx, args });
				await updateNewsletterPreferences(args);
				return true;
			}
		}),

		updateUsersGlobalNotes: t.drizzleField({
			description:
				"Replaces the care team's notes about a participant, kept separate so they are never part of a self-service update. For participant care of a conference the person takes part in or waits for; NOT_FOUND otherwise.",
			type: UserRef,
			args: {
				id: t.arg.id({ required: true }),
				globalNotes: t.arg.string({ required: true })
			},
			resolve: async (query, _root, args, ctx) => {
				await assertCanManageUser({ ctx, id: args.id });
				await setGlobalNotes(args);

				return db.query.user
					.findFirst(query(await allowedUser({ ctx, id: args.id })))
					.then(assertFindFirstExists);
			}
		}),

		updateUsersIdentityInfo: t.drizzleField({
			description:
				'Name and birthday corrections by participant care of a conference the person takes part in or waits for (NOT_FOUND otherwise); each field is optional and left as it is when absent or null.',
			type: UserRef,
			args: {
				id: t.arg.id({ required: true }),
				...identityArgs()
			},
			resolve: async (query, _root, args, ctx) => {
				await assertCanManageUser({ ctx, id: args.id });
				await updateIdentity({ id: args.id, args });

				return db.query.user
					.findFirst(query(await allowedUser({ ctx, id: args.id })))
					.then(assertFindFirstExists);
			}
		}),

		startImpersonation: t.field({
			description:
				"Acts as `targetUserId` from the next request on, until `stopImpersonation`, the session ends or the impersonation token expires. The provider issues the target's tokens through a token exchange that names the caller as their actor (`act`), and the OIDC library keeps them next to the caller's own session and checks them against it on every request. Whether the caller may still impersonate the target is checked on every request too (`impersonationHandle` in `userPermissions.ts`). FORBIDDEN when the caller may not or already impersonates somebody, or the deployment is not set up for it; CONFLICT when the provider refuses the exchange.",
			type: 'Boolean',
			args: { targetUserId: t.arg.id({ required: true }) },
			resolve: async (_root, args, ctx) => {
				const { actorId } = await assertCanImpersonate({ ctx, targetId: args.targetUserId });
				await startImpersonation({ event: ctx.event, actorId, targetId: args.targetUserId });
				return true;
			}
		}),

		stopImpersonation: t.field({
			description:
				'Puts the caller back in their own session; outside an impersonation nothing changes.',
			type: 'Boolean',
			resolve: (_root, _args, ctx) => {
				stopImpersonation({
					event: ctx.event,
					actorId: ctx.oidc.impersonator?.sub,
					targetId: ctx.oidc.user?.sub
				});
				return true;
			}
		})
	};
});

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
	canImpersonateUser: t.field({
		description:
			'Whether `startImpersonation` would let the caller act as this user, for showing the button.',
		type: 'Boolean',
		args: { targetUserId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) =>
			impersonationConfigured() && (await canImpersonate({ ctx, targetId: args.targetUserId }))
	}),

	impersonationStatus: t.field({
		description: 'Whether the caller is acting as somebody else, and if so who both are.',
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
