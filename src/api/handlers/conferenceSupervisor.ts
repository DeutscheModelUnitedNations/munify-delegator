import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	isSystemAdmin,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { fetchUserParticipations, isUserAlreadyRegistered } from '$api/services/participation';
import { makeEntryCode } from '$api/services/entryCodeGenerator';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq, inArray } from 'drizzle-orm';

// Ported from abilities/entities/conferenceSupervisor.ts
abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when(systemAdmin);

// Participant care and project management manage their conference's supervisors.
abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

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
				}
			}
		: undefined;
});

// Supervisors manage their own entry.
abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when((ctx) => {
	const where = isOwnUser(ctx);
	return where ? { where } : undefined;
});

// Supervisors see the other supervisors of the same conference.
// (Carried over from CASL with its original caveat: this is broader than it needs to be.)
abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { conference: { conferenceSupervisors: { user: { id } } } } } : undefined;
});

// Supervisors see each other's placeholders when they supervise the same delegation.
abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					supervisedDelegationMembers: {
						delegation: { members: { supervisors: { user: { id } } } }
					}
				}
			}
		: undefined;
});

export const ConferenceSupervisorRef = object({ table: 'conferenceSupervisor' });
query({ table: 'conferenceSupervisor' });

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
			if (args.userId && !isSystemAdmin(ctx)) {
				const teamMember = await db.query.teamMember.findFirst({
					where: {
						conferenceId: args.conferenceId,
						userId: callerId,
						role: { in: [...PARTICIPANT_CARE_ROLES] }
					}
				});
				if (!teamMember) {
					throw new GraphQLError(
						'Only team members with the roles PARTICIPANT_CARE or PROJECT_MANAGEMENT, or admins can assign supervisors.'
					);
				}
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

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						ctx.abilities.conferenceSupervisor.filter('read').merge({ where: { id: created.id } })
							.query.single
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
					ctx.abilities.conferenceSupervisor.filter('update').merge({ where: { id: args.id } }).sql
						.where
				);

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						ctx.abilities.conferenceSupervisor.filter('read').merge({ where: { id: args.id } })
							.query.single
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

			const supervisor = await db.query.conferenceSupervisor
				.findFirst({
					where: { conferenceId: args.conferenceId, connectionCode: args.connectionCode }
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

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						ctx.abilities.conferenceSupervisor
							.filter('read')
							.merge({ where: { id: supervisor.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	rotateSupervisorConnectionCode: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			const supervisor = await db.query.conferenceSupervisor
				.findFirst({ where: { id: args.id } })
				.then(assertFindFirstExists);

			// Only the supervisor themselves, or an admin - not the general update ability, which
			// also covers conference management.
			if (supervisor.userId !== callerId && !isSystemAdmin(ctx)) {
				throw new GraphQLError('You are not allowed to rotate this connection code.');
			}

			await db
				.update(schema.conferenceSupervisor)
				.set({ connectionCode: makeEntryCode() })
				.where(eq(schema.conferenceSupervisor.id, supervisor.id));

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						ctx.abilities.conferenceSupervisor
							.filter('read')
							.merge({ where: { id: supervisor.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteConferenceSupervisor: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.conferenceSupervisor)
				.where(
					ctx.abilities.conferenceSupervisor.filter('delete').merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.conferenceSupervisor.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Supervisor not found, or not yours to delete');
			}
			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Supervisors left supervising nobody, once the dead participants above are gone.
	 *
	 * Rows are read before deletion so the caller still gets them back, which is what the legacy
	 * resolver did - after the delete there is nothing left to query.
	 */
	deleteDeadSupervisors: t.drizzleField({
		type: [ConferenceSupervisorRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const filter = ctx.abilities.conferenceSupervisor.filter('delete').merge({
				where: {
					NOT: {
						OR: [{ supervisedDelegationMembers: {} }, { supervisedSingleParticipants: {} }]
					},
					conferenceId: args.conferenceId
				}
			});

			// Read before deleting: afterwards there is nothing left to return.
			const doomed = await db.query.conferenceSupervisor.findMany(query(filter.query.many));
			if (doomed.length === 0) return [];

			await db.delete(schema.conferenceSupervisor).where(filter.sql.where);
			return doomed;
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
					where: { conferenceId: args.conferenceId, connectionCode: args.connectionCode },
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
