import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	isManagedUser,
	isTeamMemberOf,
	isSystemAdmin,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { enum_ } from '$api/rumble';
import { eq } from 'drizzle-orm';
import { userFormSchema } from '../../routes/(authenticated)/my-account/form-schema';
import { GraphQLError } from 'graphql';
import { configPublic } from '$config/public';
import { isUniqueViolationOn } from '$api/services/emailConflict';
import { reportEmailConflict } from '$api/services/reportEmailConflict';
import type { Context } from '$api/context';

/**
 * What of a user's row a reader sees depends on how the reader relates to that row, and rumble
 * masks columns per row: each rule's `columns` apply to the rows that rule matched.
 *
 * - the person themselves: everything but the care team's notes about them;
 * - who looks after them (participant care, project management, admins): everything;
 * - their supervisors: everything but those notes;
 * - teammates: who someone is, plus their phone number - team coordinators: everything but the
 *   care notes;
 * - everybody else who may see the row at all (co-delegates, co-supervisors, reviewers reading an
 *   author): who someone is - name, email, pronouns, birthday for the age checks.
 */
const IDENTITY = {
	id: true,
	createdAt: true,
	updatedAt: true,
	email: true,
	givenName: true,
	familyName: true,
	preferredUsername: true,
	locale: true,
	pronouns: true,
	birthday: true
};
const WITHOUT_CARE_NOTES = { globalNotes: false };

// System admins may do anything to any account.
abilityBuilder.user.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see and edit themselves - but not what the care team noted about them.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { id }, columns: WITHOUT_CARE_NOTES } : undefined;
});
abilityBuilder.user.allow('update').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { id } } : undefined;
});

// Project management and participant care see everybody they look after - the participants,
// waiting-list entrants and team of the conferences they manage - in full.
abilityBuilder.user.allow('read').when((ctx) => where(isManagedUser(ctx)));

// Supervisors see the participants they supervise, contact details included.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	if (!id) return undefined;
	const supervisedByCaller = { supervisors: { user: { id } } };
	return {
		where: {
			OR: [{ delegationMemberships: supervisedByCaller }, { singleParticipant: supervisedByCaller }]
		},
		columns: WITHOUT_CARE_NOTES
	};
});

// Team coordinators see their team in full but for the care notes: the team-management page lists
// everybody's address, gender and food preference for planning.
abilityBuilder.user.allow('read').when((ctx) => {
	const conference = isTeamMemberOf(ctx, ['TEAM_COORDINATOR']);
	return conference
		? { where: { teamMember: { conference } }, columns: WITHOUT_CARE_NOTES }
		: undefined;
});

// Team members see each other, phone numbers included.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: { teamMember: { conference: { teamMembers: { user: { id } } } } },
				columns: { ...IDENTITY, phone: true }
			}
		: undefined;
});

// Delegates see each other.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: { delegationMemberships: { delegation: { members: { user: { id } } } } },
				columns: IDENTITY
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
				},
				columns: IDENTITY
			}
		: undefined;
});

// Supervisors see the other supervisors of the participants they share.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	if (!id) return undefined;
	const supervisedByCaller = { supervisors: { user: { id } } };
	return {
		where: {
			conferenceSupervisor: {
				OR: [
					{ supervisedDelegationMembers: supervisedByCaller },
					{ supervisedSingleParticipants: supervisedByCaller }
				]
			}
		},
		columns: IDENTITY
	};
});

// Reviewers and conference management see the authors of the conference's papers. They can read
// every paper there, and a paper's `author` is non-nullable, so without this a single paper by
// someone the team member may not otherwise read fails the whole review page.
abilityBuilder.user.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					papers: { conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } } }
				},
				columns: IDENTITY
			}
		: undefined;
});

/** Refuses unless the caller looks after this user - the care team's edits, not self-service. */
async function assertManagesUser(ctx: Context, id: string) {
	ctx.mustBeLoggedIn();
	const managed = isManagedUser(ctx);
	const found = managed
		? await db.query.user.findFirst({ where: { id, ...managed }, columns: { id: true } })
		: undefined;
	if (!found) {
		throw new GraphQLError('User not found, or not one you look after');
	}
}

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
					.where(
						(await ctx.abilities.delegationMember.filter('delete')).merge({ where: scope }).sql
							.where
					);

				await tx
					.delete(schema.singleParticipant)
					.where(
						(await ctx.abilities.singleParticipant.filter('delete')).merge({ where: scope }).sql
							.where
					);

				await tx
					.delete(schema.conferenceSupervisor)
					.where(
						(await ctx.abilities.conferenceSupervisor.filter('delete')).merge({ where: scope }).sql
							.where
					);

				await tx.delete(schema.conferenceParticipantStatus).where(
					(await ctx.abilities.conferenceParticipantStatus.filter('delete')).merge({
						where: scope
					}).sql.where
				);
			});

			delegationMemberPubsub.removed();
			singleParticipantPubsub.removed();
			conferenceSupervisorPubsub.removed();
			conferenceParticipantStatusPubsub.removed();

			return db.query.user
				.findFirst(
					query(
						(await ctx.abilities.user.filter('read')).merge({ where: { id: args.userId } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

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
				.where(
					(await ctx.abilities.user.filter('update')).merge({ where: { id: args.id } }).sql.where
				);

			pubsub.updated(args.id);

			return db.query.user
				.findFirst(
					query(
						(await ctx.abilities.user.filter('read')).merge({ where: { id: args.id } }).query.single
					)
				)
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
			email: t.arg.string({ required: true }),
			wantsToReceiveGeneralInformation: t.arg.boolean(),
			wantsJoinTeamInformation: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			const optsIn = args.wantsToReceiveGeneralInformation || args.wantsJoinTeamInformation;
			if (optsIn && ctx.oidc.user?.email?.toLowerCase() !== args.email.toLowerCase()) {
				throw new GraphQLError('Only the account itself may subscribe to the newsletter');
			}

			const updated = await db
				.update(schema.user)
				.set({
					wantsToReceiveGeneralInformation: args.wantsToReceiveGeneralInformation ?? undefined,
					wantsJoinTeamInformation: args.wantsJoinTeamInformation ?? undefined
				})
				.where(eq(schema.user.email, args.email))
				.returning({ id: schema.user.id });

			for (const { id } of updated) pubsub.updated(id);

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
			await assertManagesUser(ctx, args.id);

			await db
				.update(schema.user)
				.set({ globalNotes: args.globalNotes })
				.where(eq(schema.user.id, args.id));

			pubsub.updated(args.id);

			return db.query.user
				.findFirst(
					query(
						(await ctx.abilities.user.filter('read')).merge({ where: { id: args.id } }).query.single
					)
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
			await assertManagesUser(ctx, args.id);

			await db
				.update(schema.user)
				.set({
					givenName: args.givenName ?? undefined,
					familyName: args.familyName ?? undefined,
					birthday: args.birthday ?? undefined
				})
				.where(eq(schema.user.id, args.id));

			pubsub.updated(args.id);

			return db.query.user
				.findFirst(
					query(
						(await ctx.abilities.user.filter('read')).merge({ where: { id: args.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
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

/** Answers an email conflict on the mutation with an error the frontend can tell apart. */
async function throwEmailConflict(
	userSubject: string,
	email: string,
	error: unknown
): Promise<never> {
	const conflict = await reportEmailConflict(userSubject, email, error, maskEmail);

	throw new GraphQLError('Email address is already in use by another account', {
		extensions: {
			code: 'EMAIL_CONFLICT',
			isNewUser: conflict.isNewUser,
			maskedConflictingEmail: conflict.maskedConflictingEmail,
			maskedExistingEmail: conflict.maskedExistingEmail,
			refId: conflict.refId
		}
	});
}

/** The claims the caller's own row is written from; an account without an email cannot have one. */
function selfClaims(caller: ReturnType<Context['mustBeLoggedIn']>) {
	if (!caller.email) {
		throw new GraphQLError('OIDC result is missing required field: email');
	}
	return { email: caller.email, locale: caller.locale ?? configPublic.PUBLIC_DEFAULT_LOCALE };
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
			const { email, locale } = selfClaims(caller);

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
				return throwEmailConflict(caller.sub, email, error);
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
	})
}));

/** Participant care, project management (of any conference) and admins may look users up. */
async function assertMayPreviewUsers(ctx: Context) {
	const caller = ctx.mustBeLoggedIn();
	if (isSystemAdmin(ctx)) return;

	const privileged = await db.query.teamMember.findFirst({
		where: { userId: caller.sub, role: { in: [...PARTICIPANT_CARE_ROLES] } }
	});
	if (!privileged) {
		throw new GraphQLError(
			'You are not allowed to preview users. You need to be a team member with the role PARTICIPANT_CARE or PROJECT_MANAGEMENT or an admin.'
		);
	}
}

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
			await assertMayPreviewUsers(ctx);

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
