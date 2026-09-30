import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
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
import { GraphQLError } from 'graphql';
import * as Sentry from '@sentry/sveltekit';
import { configPublic } from '$config/public';

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

// Project management and participant care see the delegates, single participants, supervisors
// and waiting-list entrants of the conferences they manage. Dropped during the CASL -> rumble
// port (present in the legacy abilities/entities/user.ts, absent here) - without this, reading
// a participant's own User record 404s the whole page for anything driven by a non-nullable
// `user` relation, e.g. the management assignment project.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	if (!id) return undefined;
	const team = { teamMembers: { user: { id }, role: { in: [...PARTICIPANT_CARE_ROLES] } } };
	return {
		where: {
			OR: [
				{ delegationMemberships: { delegation: { conference: team } } },
				{ singleParticipant: { conference: team } },
				{ conferenceSupervisor: { conference: team } },
				{ waitingListEntry: { conference: team } }
			]
		}
	};
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
			resolve: async (user) => {
				const [memberships, participations] = await Promise.all([
					db.query.delegationMember.findMany({
						where: {
							userId: user.id,
							delegation: {
								OR: [
									{ assignedNationAlpha3Code: { isNotNull: true } },
									{ assignedNonStateActorId: { isNotNull: true } }
								]
							}
						},
						columns: { id: true }
					}),
					db.query.singleParticipant.findMany({
						where: { userId: user.id, assignedRoleId: { isNotNull: true } },
						columns: { id: true }
					})
				]);

				return memberships.length + participations.length;
			}
		})
	})
});
query({ table: 'user' });
const pubsub = rumblePubsub({ table: 'user' });
// Unregistering somebody tears down every registration they hold in that conference.
const delegationMemberPubsub = rumblePubsub({ table: 'delegationMember' });
const singleParticipantPubsub = rumblePubsub({ table: 'singleParticipant' });
const conferenceSupervisorPubsub = rumblePubsub({ table: 'conferenceSupervisor' });
const conferenceParticipantStatusPubsub = rumblePubsub({
	table: 'conferenceParticipantStatus'
});

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

			delegationMemberPubsub.removed();
			singleParticipantPubsub.removed();
			conferenceSupervisorPubsub.removed();
			conferenceParticipantStatusPubsub.removed();

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

			pubsub.updated(args.id);

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

			// Addressed by email rather than id, so this is a table-wide notification.
			pubsub.updated();

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

			pubsub.updated(args.id);

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

			pubsub.updated(args.id);

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
			pubsub.removed();

			return true;
		}
	})
}));

const IMPERSONATION_STALLED =
	'Impersonation is temporarily unavailable while the login flow is being migrated.';

schemaBuilder.mutationFields((t) => ({
	/*
	 * Impersonation is stalled while the login flow moves to `@m1212e/sveltekit-oidc`.
	 *
	 * The old implementation swapped the session by writing a second token set into its own cookie
	 * and re-reading it when building the request context. The library owns the session cookies now
	 * and has no notion of acting as somebody else, so this wants designing again rather than
	 * porting - as a token exchange the library performs, or as an app-level "acting as" that never
	 * touches the session at all.
	 *
	 * The fields stay in the schema so the frontend keeps compiling, and say plainly that they are
	 * unavailable.
	 */
	startImpersonation: t.field({
		type: 'Boolean',
		args: {
			targetUserId: t.arg.id({ required: true }),
			scope: t.arg.string()
		},
		resolve: () => {
			throw new GraphQLError(IMPERSONATION_STALLED);
		}
	}),

	stopImpersonation: t.field({
		type: 'Boolean',
		resolve: () => {
			throw new GraphQLError(IMPERSONATION_STALLED);
		}
	})
}));

const UpsertSelfResult = schemaBuilder.simpleObject('UpsertSelfResult', {
	fields: (t) => ({
		userNeedsAdditionalInfo: t.boolean(),
		userId: t.string()
	})
});

/** Postgres reports a unique index violation as 23505. */
function isUniqueViolationOn(error: unknown, column: string) {
	if (typeof error !== 'object' || error === null) return false;
	const candidate: { code?: unknown; constraint?: unknown; detail?: unknown } = error;
	if (candidate.code !== '23505') return false;
	return (
		String(candidate.constraint ?? '').includes(column) ||
		String(candidate.detail ?? '').includes(column)
	);
}

/** Enough of an address to recognise it in a log without writing the whole thing down. */
function maskEmail(email: string): string {
	const [localPart, domain] = email.split('@');
	if (!localPart || !domain) {
		return '***@***';
	}
	if (localPart.length <= 2) {
		return `${localPart[0]}***@${domain}`;
	}
	return `${localPart.slice(0, 2)}***@${domain}`;
}

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
			const caller = ctx.mustBeLoggedIn();
			if (!caller.email) {
				throw new GraphQLError('OIDC result is missing required field: email');
			}
			const email = caller.email;
			const locale = caller.locale ?? configPublic.PUBLIC_DEFAULT_LOCALE;

			try {
				const [user] = await db
					.insert(schema.user)
					.values({
						id: caller.sub,
						email,
						familyName: '',
						givenName: '',
						preferredUsername: email,
						locale
					})
					.onConflictDoUpdate({ target: schema.user.id, set: { email, locale } })
					.returning();

				// An upsert on sign-in, so one notification on whichever row now holds the account.
				pubsub.updated(user.id);

				return {
					userNeedsAdditionalInfo: !userFormSchema.safeParse({
						...user,
						given_name: user.givenName,
						family_name: user.familyName
					}).success,
					userId: user.id
				};
			} catch (error) {
				if (!isUniqueViolationOn(error, 'email')) throw error;

				// Someone else already holds this address. Two ways to get here: a brand new
				// account whose address is taken, or an existing account changing to a taken one.
				// The frontend shows a different page for each, so say which it is.
				const existing = await db.query.user.findFirst({
					where: { id: caller.sub },
					columns: { email: true }
				});

				const isNewUser = existing === undefined;
				const maskedConflictingEmail = maskEmail(email);
				const maskedExistingEmail = existing?.email ? maskEmail(existing.email) : undefined;
				const refId = caller.sub.slice(-8);

				console.error(`[EMAIL_CONFLICT] ${isNewUser ? 'New user' : 'Email change'} conflict:`, {
					userSubject: caller.sub,
					conflictingEmail: maskedConflictingEmail,
					existingUserEmail: maskedExistingEmail ?? 'N/A',
					refId,
					timestamp: new Date().toISOString()
				});

				Sentry.captureException(error, {
					level: 'warning',
					tags: {
						error_type: 'email_conflict',
						scenario: isNewUser ? 'new_user' : 'email_change'
					},
					extra: {
						userSubject: caller.sub,
						conflictingEmail: maskedConflictingEmail,
						existingUserEmail: maskedExistingEmail ?? 'N/A',
						refId
					}
				});

				throw new GraphQLError('Email address is already in use by another account', {
					extensions: {
						code: 'EMAIL_CONFLICT',
						isNewUser,
						maskedConflictingEmail,
						maskedExistingEmail,
						refId
					}
				});
			}
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
		// Always "not impersonating" while the feature is stalled; see the mutations above.
		resolve: () => ({ isImpersonating: false, originalUser: null, impersonatedUser: null })
	}),

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
