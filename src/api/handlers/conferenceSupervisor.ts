import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { fetchUserParticipations, isUserAlreadyRegistered } from '$api/services/participation';
import { makeEntryCode } from '$api/services/entryCodeGenerator';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';

// Ported from abilities/entities/conferenceSupervisor.ts
abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when(systemAdmin);

// Participant care and project management manage their conference's supervisors.
abilityBuilder.conferenceSupervisor
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

/**
 * Whoever holds a supervisor's connection code can attach themselves to that supervisor, so it is
 * the supervisor's to hand out: only they and participant care read it.
 */
/** Codes are generated uppercase, but people type them in lowercase or paste whitespace along. */
const normalizeConnectionCode = (code: string) => code.trim().toUpperCase();

const WITHOUT_CONNECTION_CODE = { connectionCode: false };

// Supervised participants see their own supervisors.
abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					OR: [
						{ supervisedDelegationMembers: { user: { id } } },
						{ supervisedSingleParticipants: { user: { id } } }
					]
				},
				columns: WITHOUT_CONNECTION_CODE
			}
		: undefined;
});

// Supervisors manage their own entry.
abilityBuilder.conferenceSupervisor
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isOwnUser(ctx)));

// Supervisors see the other supervisors of the participants they share - the group payment page
// splits a fee between them.
abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
	const id = userId(ctx);
	if (!id) return undefined;
	const supervisedByMe = { supervisors: { user: { id } } };
	return {
		where: {
			OR: [
				{ supervisedDelegationMembers: supervisedByMe },
				{ supervisedSingleParticipants: supervisedByMe }
			]
		},
		columns: WITHOUT_CONNECTION_CODE
	};
});

const ConferenceSupervisorRef = object({ table: 'conferenceSupervisor' });
query({ table: 'conferenceSupervisor' });
const pubsub = rumblePubsub({ table: 'conferenceSupervisor' });
// The supervision links are join tables, so a change there shows up on the two sides of it.
const delegationMemberPubsub = rumblePubsub({ table: 'delegationMember' });
const singleParticipantPubsub = rumblePubsub({ table: 'singleParticipant' });

schemaBuilder.mutationFields((t) => ({
	createConferenceSupervisor: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** Omitted when someone registers themselves; set when a team member assigns another user. */
			userId: t.arg.id(),
			plansOwnAttendenceAtConference: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}
			const subjectId = args.userId ?? callerId;

			// Assigning somebody else needs participant care, project management or admin. Registering
			// yourself does not - which is why the check is gated on `args.userId` being present.
			if (args.userId && args.userId !== callerId) {
				await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			}

			if (await isUserAlreadyRegistered({ userId: subjectId, conferenceId: args.conferenceId })) {
				throw new GraphQLError(
					"User is already assigned a different role in the conference. Can't assign supervisor."
				);
			}

			const created = await db
				.insert(schema.conferenceSupervisor)
				.values({
					conferenceId: args.conferenceId,
					userId: subjectId,
					plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? true,
					connectionCode: makeEntryCode()
				})
				.returning()
				.then(assertFirstEntryExists);

			pubsub.created();

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateConferenceSupervisor: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: {
			id: t.arg.id({ required: true }),
			plansOwnAttendenceAtConference: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.conferenceSupervisor)
				.set({ plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? undefined })
				.where(
					(await ctx.abilities.conferenceSupervisor.filter('update')).merge({
						where: { id: args.id }
					}).sql.where
				);

			pubsub.updated(args.id);

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: args.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** A participant attaches themselves to a supervisor using that supervisor's connection code. */
	connectToConferenceSupervisor: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			connectionCode: t.arg.string({ required: true }),
			userId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}
			const subjectId = args.userId ?? callerId;
			// Connecting somebody else is participant care's job (the user card's supervisor modal);
			// the code alone only lets a participant attach themselves.
			if (subjectId !== callerId) {
				await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			}

			const supervisor = await db.query.conferenceSupervisor
				.findFirst({
					where: {
						conferenceId: args.conferenceId,
						connectionCode: normalizeConnectionCode(args.connectionCode)
					}
				})
				.then(assertFindFirstExists);

			const participation = await fetchUserParticipations({
				conferenceId: args.conferenceId,
				userId: subjectId
			});

			if (participation.foundSupervisor || participation.foundTeamMember) {
				throw new GraphQLError(
					'You are already a supervisor or team member of this conference and cannot connect to a supervisor.'
				);
			}
			if (!participation.foundDelegationMember && !participation.foundSingleParticipant) {
				throw new GraphQLError(
					'You are not a participant of this conference and cannot connect to a supervisor inside it.'
				);
			}

			// Both supervision links are many-to-many join tables.
			if (participation.foundDelegationMember) {
				await db
					.insert(schema.conferenceSupervisorToDelegationMember)
					.values({ a: supervisor.id, b: participation.foundDelegationMember.id })
					.onConflictDoNothing();
			}
			if (participation.foundSingleParticipant) {
				await db
					.insert(schema.conferenceSupervisorToSingleParticipant)
					.values({ a: supervisor.id, b: participation.foundSingleParticipant.id })
					.onConflictDoNothing();
			}

			// Nothing on the supervisor row itself changed, but who it supervises did.
			pubsub.updated(supervisor.id);
			if (participation.foundDelegationMember) {
				delegationMemberPubsub.updated(participation.foundDelegationMember.id);
			}
			if (participation.foundSingleParticipant) {
				singleParticipantPubsub.updated(participation.foundSingleParticipant.id);
			}

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: supervisor.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	rotateSupervisorConnectionCode: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			// The supervisor themselves, participant care and project management, and admins: the
			// row's update ability.
			const supervisor = await db.query.conferenceSupervisor.findFirst({
				...(await ctx.abilities.conferenceSupervisor.filter('update')).merge({
					where: { id: args.id }
				}).query.single,
				columns: { id: true }
			});
			if (!supervisor) {
				throw new GraphQLError('You are not allowed to rotate this connection code.');
			}

			await db
				.update(schema.conferenceSupervisor)
				.set({ connectionCode: makeEntryCode() })
				.where(eq(schema.conferenceSupervisor.id, supervisor.id));

			pubsub.updated(supervisor.id);

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: supervisor.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

const PreviewConferenceSupervisor = schemaBuilder.simpleObject('PreviewConferenceSupervisor', {
	fields: (t) => ({
		given_name: t.string({ nullable: true }),
		family_name: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * Shows whose supervision a participant is about to accept, before they connect.
	 *
	 * Like `previewDelegation`, the connection code is the authorisation - but this one also
	 * requires the caller to already take part in the conference in some role, so an arbitrary
	 * logged-in user cannot probe codes.
	 */
	previewConferenceSupervisor: t.field({
		type: PreviewConferenceSupervisor,
		args: {
			conferenceId: t.arg.id({ required: true }),
			connectionCode: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const caller = ctx.mustBeLoggedIn();

			const participation = await fetchUserParticipations({
				conferenceId: args.conferenceId,
				userId: caller.sub
			});

			if (
				!participation.foundDelegationMember &&
				!participation.foundSingleParticipant &&
				!participation.foundTeamMember &&
				!participation.foundSupervisor
			) {
				throw new GraphQLError('You are not registered for this conference.');
			}

			const supervisor = await db.query.conferenceSupervisor
				.findFirst({
					where: {
						conferenceId: args.conferenceId,
						connectionCode: normalizeConnectionCode(args.connectionCode)
					},
					with: { user: { columns: { givenName: true, familyName: true } } }
				})
				.then(assertFindFirstExists);

			return {
				given_name: supervisor.user?.givenName ?? null,
				family_name: supervisor.user?.familyName ?? null
			};
		}
	})
}));
