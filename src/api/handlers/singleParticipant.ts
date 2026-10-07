import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { fetchUserParticipations, isUserAlreadyRegistered } from '$api/services/participation';
import { assertTeamRole } from '$api/services/authHelper';
import { assertApplicationReady } from '$api/services/applicationReadiness';
import { nullToUndefined } from '$api/services/args';
import { applicationFormSchema } from '$lib/schemata/applicationForm';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { and, eq, inArray } from 'drizzle-orm';

// Ported from abilities/entities/singleParticipant.ts
abilityBuilder.singleParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own entry.
abilityBuilder.singleParticipant.allow('read').when((ctx) => where(isOwnUser(ctx)));

// Participant care and project management see and manage their conference's participants.
abilityBuilder.singleParticipant
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

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

const SingleParticipantRef = object({ table: 'singleParticipant' });
query({ table: 'singleParticipant' });
const pubsub = rumblePubsub({ table: 'singleParticipant' });
// Assigning someone from the waiting list also settles their entry there.
const waitingListEntryPubsub = rumblePubsub({ table: 'waitingListEntry' });

/** Refuses role ids that are not custom roles of the given conference. */
async function assertRolesOf(conferenceId: string, roleIds: readonly string[]) {
	const unique = [...new Set(roleIds)];
	if (unique.length === 0) return;
	const roles = await db.query.customConferenceRole.findMany({
		where: { id: { in: unique }, conferenceId },
		columns: { id: true }
	});
	if (roles.length !== unique.length) {
		throw new GraphQLError('Not every given role belongs to this conference');
	}
}

/**
 * The caller's existing single registration in the conference, if any, after making sure they may
 * register (again): not already in the conference in another way - unlike the delegation flow an
 * existing single registration is tolerated, and edited - and not already sent in, which is the
 * same line the update ability draws. The role applied for has to be one of the conference's.
 */
async function ownRegistrationToEdit(conferenceId: string, userId: string, roleId: string) {
	const { foundDelegationMember, foundSupervisor, foundTeamMember, foundSingleParticipant } =
		await fetchUserParticipations({ conferenceId, userId });
	if (foundDelegationMember || foundSupervisor || foundTeamMember) {
		throw new GraphQLError(
			m.youCantApplyAsSingleParticipantAsYouAreAlreadyAppliedInTheConference()
		);
	}
	if (foundSingleParticipant?.applied) {
		throw new GraphQLError(m.youAreAlreadySingleParticipant());
	}
	await assertRolesOf(conferenceId, [roleId]);
	return foundSingleParticipant;
}

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

			const existing = await ownRegistrationToEdit(args.conferenceId, id, args.roleId);

			let rowId: string;
			if (existing) {
				await db
					.update(schema.singleParticipant)
					.set({
						school: args.school,
						motivation: args.motivation,
						experience: args.experience
					})
					.where(eq(schema.singleParticipant.id, existing.id));
				rowId = existing.id;
			} else {
				const created = await db
					.insert(schema.singleParticipant)
					.values({
						conferenceId: args.conferenceId,
						userId: id,
						school: nullToUndefined(args.school),
						motivation: nullToUndefined(args.motivation),
						experience: nullToUndefined(args.experience)
					})
					.returning()
					.then(assertFirstEntryExists);
				rowId = created.id;
			}

			await applyForRoles(rowId, [args.roleId]);

			pubsub.created();

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({ where: { id: rowId } })
							.query.single
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
			const updatable = (await ctx.abilities.singleParticipant.filter('update')).merge({
				where: { id: args.id }
			});

			// Checked up front: the role changes below go to the join table directly, so an update
			// that matched no row would otherwise not stop them.
			const target = await db.query.singleParticipant
				.findFirst({ ...updatable.query.single, columns: { id: true, conferenceId: true } })
				.then(assertFindFirstExists);
			await assertRolesOf(target.conferenceId, args.applyForRolesIdList ?? []);

			if (args.applied) {
				const participant = await db.query.singleParticipant
					.findFirst({
						...updatable.query.single,
						with: { appliedForRoles: true, conference: true }
					})
					.then(assertFindFirstExists);

				assertApplicationReady(participant, args, 1);
			}

			applicationFormSchema.parse({
				school: args.school,
				experience: args.experience,
				motivation: args.motivation
			});

			// School, motivation and experience are nullable, so an explicit null clears them.
			const values = {
				school: args.school,
				experience: args.experience,
				motivation: args.motivation,
				applied: args.applied ?? undefined
			};
			// A call that only changes role applications has nothing to set, and drizzle rejects an
			// empty `set` ("No values to set").
			if (Object.values(values).some((value) => value !== undefined)) {
				await db.update(schema.singleParticipant).set(values).where(updatable.sql.where);
			}

			await applyForRoles(args.id, args.applyForRolesIdList ?? []);
			await unapplyForRoles(args.id, args.unApplyForRolesIdList ?? []);

			pubsub.updated(args.id);

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({ where: { id: args.id } })
							.query.single
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
					(await ctx.abilities.singleParticipant.filter('delete')).merge({ where: { id: args.id } })
						.sql.where
				)
				.returning({ id: schema.singleParticipant.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Single participant not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
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
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			await assertRolesOf(args.conferenceId, [args.roleId]);
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

			pubsub.created();
			waitingListEntryPubsub.updated();

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
