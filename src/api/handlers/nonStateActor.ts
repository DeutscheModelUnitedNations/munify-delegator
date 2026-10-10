import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	SEAT_PLANNING_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { errorCause, isUniqueViolationOn } from '$api/services/emailConflict';
import { normalizeRoleApplicationRanks } from '$api/services/normalizeRoleApplicationRanks';
import {
	assertNonStateActorDeletable,
	assertSeatsPerDelegationAllowed,
	nonStateActorUpdateData
} from '$api/services/seatPlanning';
import { tidyRoleApplicationsForRoles } from '$api/services/tidyRoleApplications';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { visibleAssignedDelegations } from '$api/services/assignmentVisibility';
import { GraphQLError } from 'graphql';

abilityBuilder.nonStateActor.allow('read');
abilityBuilder.nonStateActor.allow(['update', 'delete']).when(systemAdmin);

// The non-state actors are part of the seat planning, which project management shares with the
// content lead. Deleting one is blocked while a delegation is assigned to it.
abilityBuilder.nonStateActor
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, SEAT_PLANNING_ROLES)));

export const NonStateActorRef = object({
	table: 'nonStateActor',
	adjust: (t) => ({
		assignedDelegations: t.relation('assignedDelegations', { query: visibleAssignedDelegations })
	})
});
query({ table: 'nonStateActor' });
const pubsub = rumblePubsub({ table: 'nonStateActor' });
const roleApplicationPubsub = rumblePubsub({ table: 'roleApplication' });

/** Names and abbreviations are unique per conference; the database says so as a 23505. */
async function withUniqueNameCheck<T>(operation: Promise<T>) {
	try {
		return await operation;
	} catch (error) {
		if (isUniqueViolationOn(errorCause(error), 'non_state_actor_conference_id')) {
			throw new GraphQLError(m.nonStateActorNotUnique());
		}
		throw error;
	}
}

schemaBuilder.mutationFields((t) => ({
	createNonStateActor: t.drizzleField({
		type: NonStateActorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			abbreviation: t.arg.string({ required: true }),
			description: t.arg.string({ required: true }),
			fontAwesomeIcon: t.arg.string(),
			seatAmount: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, SEAT_PLANNING_ROLES);
			assertSeatsPerDelegationAllowed(args.seatAmount, []);

			const created = await withUniqueNameCheck(
				db
					.insert(schema.nonStateActor)
					.values({
						conferenceId: args.conferenceId,
						name: args.name,
						abbreviation: args.abbreviation,
						description: args.description,
						fontAwesomeIcon: args.fontAwesomeIcon || null,
						seatAmount: args.seatAmount
					})
					.returning({ id: schema.nonStateActor.id })
					.then(assertFirstEntryExists)
			);

			pubsub.created();

			return db.query.nonStateActor
				.findFirst(
					query(
						(await ctx.abilities.nonStateActor.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateNonStateActor: t.drizzleField({
		type: NonStateActorRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			abbreviation: t.arg.string(),
			description: t.arg.string(),
			fontAwesomeIcon: t.arg.string(),
			seatAmount: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			const updateFilter = (await ctx.abilities.nonStateActor.filter('update')).merge({
				where: { id: args.id }
			});
			const data = nonStateActorUpdateData(args);

			const before = await db.query.nonStateActor
				.findFirst({
					where: updateFilter.query.single.where,
					columns: { id: true, conferenceId: true, seatAmount: true }
				})
				.then(assertFindFirstExists);

			await withUniqueNameCheck(
				db.update(schema.nonStateActor).set(data).where(updateFilter.sql.where)
			);

			pubsub.updated(args.id);

			// lowering the seats is allowed, but applications that no longer fit are dropped
			if ((args.seatAmount ?? before.seatAmount) < before.seatAmount) {
				await tidyRoleApplicationsForRoles(before.conferenceId, { nonStateActorIds: [before.id] });
				roleApplicationPubsub.removed();
			}

			return db.query.nonStateActor
				.findFirst(
					query(
						(await ctx.abilities.nonStateActor.filter('read')).merge({
							where: { id: args.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteNonStateActor: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleteFilter = (await ctx.abilities.nonStateActor.filter('delete')).merge({
				where: { id: args.id }
			});

			await db.transaction(async (tx) => {
				const existing = await tx.query.nonStateActor.findFirst({
					where: deleteFilter.query.single.where,
					columns: { id: true },
					with: { assignedDelegations: { columns: { id: true } } }
				});
				if (!existing) {
					throw new GraphQLError('Non-state actor not found, or not yours to delete');
				}

				assertNonStateActorDeletable(existing.assignedDelegations.length);

				// applications for it go with it, closing the gaps they leave in the rankings
				const applications = await tx
					.delete(schema.roleApplication)
					.where(eq(schema.roleApplication.nonStateActorId, existing.id))
					.returning({ delegationId: schema.roleApplication.delegationId });
				for (const delegationId of new Set(applications.map((a) => a.delegationId))) {
					await normalizeRoleApplicationRanks(delegationId, tx);
				}

				await tx.delete(schema.nonStateActor).where(eq(schema.nonStateActor.id, existing.id));
			});

			pubsub.removed();
			roleApplicationPubsub.removed();

			return true;
		}
	})
}));
