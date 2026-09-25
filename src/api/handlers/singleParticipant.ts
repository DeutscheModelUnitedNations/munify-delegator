import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { fetchUserParticipations, isUserAlreadyRegistered } from '$api/services/participation';
import { assertMayManageConference } from '$api/services/authHelper';
import { applicationFormSchema } from '$lib/schemata/applicationForm';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { and, eq, inArray } from 'drizzle-orm';
import dayjs from 'dayjs';

// Ported from abilities/entities/singleParticipant.ts
abilityBuilder.singleParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own entry.
abilityBuilder.singleParticipant.allow('read').when((ctx) => {
	const where = isOwnUser(ctx);
	return where ? { where } : undefined;
});

// Participant care and project management see and manage their conference's participants.
abilityBuilder.singleParticipant.allow(['read', 'update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

// Users may change their own entry only until they have applied.
abilityBuilder.singleParticipant.allow(['update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { user: { id }, applied: false } } : undefined;
});

// Supervisors see the participants they supervise.
abilityBuilder.singleParticipant.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { supervisors: { user: { id } } } } : undefined;
});

export const SingleParticipantRef = object({ table: 'singleParticipant' });
query({ table: 'singleParticipant' });

/** Links a single participant to a custom conference role (the join table behind `appliedForRoles`). */
async function applyForRoles(singleParticipantId: string, roleIds: string[]) {
	if (roleIds.length === 0) return;
	await db
		.insert(schema.customConferenceRoleToSingleParticipant)
		.values(roleIds.map((roleId) => ({ a: roleId, b: singleParticipantId })))
		.onConflictDoNothing();
}

async function unapplyForRoles(singleParticipantId: string, roleIds: string[]) {
	if (roleIds.length === 0) return;
	await db
		.delete(schema.customConferenceRoleToSingleParticipant)
		.where(
			and(
				eq(schema.customConferenceRoleToSingleParticipant.b, singleParticipantId),
				inArray(schema.customConferenceRoleToSingleParticipant.a, roleIds)
			)
		);
}

schemaBuilder.mutationFields((t) => ({
	/**
	 * Registering as a single participant. If the user already has an entry for this conference
	 * the legacy resolver updated it instead of failing, so this does the same.
	 */
	createSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true }),
			school: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw new GraphQLError('Must be logged in');
			}

			applicationFormSchema.parse({
				school: args.school,
				motivation: args.motivation,
				experience: args.experience
			});

			// Unlike the delegation flow this tolerates an existing single participant entry, so the
			// three other participation kinds are checked individually rather than with
			// `throwIfAnyIsFound`.
			const { foundDelegationMember, foundSupervisor, foundTeamMember } =
				await fetchUserParticipations({ conferenceId: args.conferenceId, userId: id });
			if (foundDelegationMember || foundSupervisor || foundTeamMember) {
				throw new GraphQLError(
					m.youCantApplyAsSingleParticipantAsYouAreAlreadyAppliedInTheConference()
				);
			}

			const existing = await db.query.singleParticipant.findFirst({
				where: { conferenceId: args.conferenceId, userId: id }
			});

			let rowId: string;
			if (existing) {
				await db
					.update(schema.singleParticipant)
					.set({
						school: args.school ?? undefined,
						motivation: args.motivation ?? undefined,
						experience: args.experience ?? undefined
					})
					.where(eq(schema.singleParticipant.id, existing.id));
				rowId = existing.id;
			} else {
				const created = await db
					.insert(schema.singleParticipant)
					.values({
						conferenceId: args.conferenceId,
						userId: id,
						school: args.school ?? undefined,
						motivation: args.motivation ?? undefined,
						experience: args.experience ?? undefined
					})
					.returning()
					.then(assertFirstEntryExists);
				rowId = created.id;
			}

			await applyForRoles(rowId, [args.roleId]);

			return db.query.singleParticipant
				.findFirst(
					query(
						ctx.abilities.singleParticipant.filter('read').merge({ where: { id: rowId } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			id: t.arg.id({ required: true }),
			school: t.arg.string(),
			experience: t.arg.string(),
			motivation: t.arg.string(),
			applyForRolesIdList: t.arg.idList(),
			unApplyForRolesIdList: t.arg.idList(),
			applied: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			const updatable = ctx.abilities.singleParticipant
				.filter('update')
				.merge({ where: { id: args.id } });

			if (args.applied) {
				const participant = await db.query.singleParticipant
					.findFirst({
						...updatable.query.single,
						with: { appliedForRoles: true, conference: true }
					})
					.then(assertFindFirstExists);

				if (participant.appliedForRoles.length < 1) {
					throw new GraphQLError(m.notEnoughtRoleApplications());
				}
				if (
					!participant.school ||
					!participant.experience ||
					!participant.motivation ||
					!applicationFormSchema.safeParse({
						school: args.school ?? participant.school,
						motivation: args.motivation ?? participant.motivation,
						experience: args.experience ?? participant.experience
					}).success
				) {
					throw new GraphQLError(m.missingInformation());
				}
				const conference = participant.conference;
				if (
					conference &&
					dayjs(conference.startAssignment)
						.add(conference.registrationDeadlineGracePeriodMinutes, 'minute')
						.isBefore(dayjs())
				) {
					throw new GraphQLError(m.applicationTimeframeClosed());
				}
			}

			applicationFormSchema.parse({
				school: args.school,
				experience: args.experience,
				motivation: args.motivation
			});

			await db
				.update(schema.singleParticipant)
				.set({
					school: args.school ?? undefined,
					experience: args.experience ?? undefined,
					motivation: args.motivation ?? undefined,
					applied: args.applied ?? undefined
				})
				.where(updatable.sql.where);

			await applyForRoles(args.id, args.applyForRolesIdList ?? []);
			await unapplyForRoles(args.id, args.unApplyForRolesIdList ?? []);

			return db.query.singleParticipant
				.findFirst(
					query(
						ctx.abilities.singleParticipant.filter('read').merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteSingleParticipant: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.singleParticipant)
				.where(
					ctx.abilities.singleParticipant.filter('delete').merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.singleParticipant.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Single participant not found, or not yours to delete');
			}
			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Single participants who were never assigned a role.
	 *
	 * Rows are read before deletion so the caller still gets them back, which is what the legacy
	 * resolver did - after the delete there is nothing left to query.
	 */
	deleteDeadSingleParticipants: t.drizzleField({
		type: [SingleParticipantRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const filter = ctx.abilities.singleParticipant
				.filter('delete')
				.merge({ where: { assignedRoleId: { isNull: true }, conferenceId: args.conferenceId } });

			// Read before deleting: afterwards there is nothing left to return.
			const doomed = await db.query.singleParticipant.findMany(query(filter.query.many));
			if (doomed.length === 0) return [];

			await db.delete(schema.singleParticipant).where(filter.sql.where);
			return doomed;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/** Management assigning a user directly as a single participant with a role. */
	createAppliedSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertMayManageConference(args.conferenceId, userId(ctx), PARTICIPANT_CARE_ROLES, {
				allowSystemAdmin: true,
				ctx
			});

			if (await isUserAlreadyRegistered({ userId: args.userId, conferenceId: args.conferenceId })) {
				throw new GraphQLError(
					"User is already assigned a different role in the conference. Can't assign SingleParticipant."
				);
			}

			const created = await db.transaction(async (tx) => {
				// Best-effort: not every assigned user came from the waiting list.
				await tx
					.update(schema.waitingListEntry)
					.set({ assigned: true })
					.where(
						and(
							eq(schema.waitingListEntry.conferenceId, args.conferenceId),
							eq(schema.waitingListEntry.userId, args.userId)
						)
					);

				return tx
					.insert(schema.singleParticipant)
					.values({
						conferenceId: args.conferenceId,
						userId: args.userId,
						applied: true,
						assignedRoleId: args.roleId
					})
					.returning()
					.then(assertFirstEntryExists);
			});

			return db.query.singleParticipant
				.findFirst(
					query(
						ctx.abilities.singleParticipant.filter('read').merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
