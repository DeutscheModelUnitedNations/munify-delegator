import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isInOwnDelegation,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { count, eq } from 'drizzle-orm';
import { countGiven, nullToUndefined } from '$api/services/args';
import { normalizeRoleApplicationRanks } from '$api/services/normalizeRoleApplicationRanks';

// Ported from abilities/entities/roleApplication.ts
abilityBuilder.roleApplication.allow(['read', 'update', 'delete']).when(systemAdmin);

// Participant care and project management see their conference's applications.
abilityBuilder.roleApplication.allow('read').when((ctx) => {
	const delegation = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return delegation ? { where: { delegation } } : undefined;
});

// Delegation members see their own delegation's applications.
abilityBuilder.roleApplication.allow('read').when((ctx) => where(isInOwnDelegation(ctx)));

// Only the head delegate may change them, and only until the delegation has applied - the same
// line the delegation's own update ability draws.
abilityBuilder.roleApplication.allow(['update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					delegation: { applied: false, members: { user: { id }, isHeadDelegate: true } }
				}
			}
		: undefined;
});

// Supervisors see the applications of the delegations they supervise.
abilityBuilder.roleApplication.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { delegation: { members: { supervisors: { user: { id } } } } } } : undefined;
});

const RoleApplicationRef = object({ table: 'roleApplication' });
query({ table: 'roleApplication' });
const pubsub = rumblePubsub({ table: 'roleApplication' });

schemaBuilder.mutationFields((t) => ({
	createRoleApplication: t.drizzleField({
		type: RoleApplicationRef,
		args: {
			delegationId: t.arg.id({ required: true }),
			nationId: t.arg.id(),
			nonStateActorId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			const targets = countGiven(args.nationId, args.nonStateActorId);
			if (targets === 0) {
				throw new GraphQLError('Either nationId or nonStateActorId must be provided');
			}
			if (targets > 1) {
				throw new GraphQLError('Only one of nationId or nonStateActorId can be provided');
			}

			// The caller must be allowed to update the delegation the application belongs to.
			const delegation = await db.query.delegation
				.findFirst({
					...(await ctx.abilities.delegation.filter('update')).merge({
						where: { id: args.delegationId }
					}).query.single,
					columns: { conferenceId: true }
				})
				.then(assertFindFirstExists);

			// ...and the role applied for must be on offer in that conference.
			const onOffer = args.nationId
				? await db.query.nation.findFirst({
						where: {
							alpha3Code: args.nationId,
							committees: { conferenceId: delegation.conferenceId }
						},
						columns: { alpha3Code: true }
					})
				: await db.query.nonStateActor.findFirst({
						where: { id: args.nonStateActorId ?? '', conferenceId: delegation.conferenceId },
						columns: { id: true }
					});
			if (!onOffer) {
				throw new GraphQLError('This role is not on offer in the conference');
			}

			const created = await db.transaction(async (tx) => {
				// Close any gap first, so "one past the count" cannot collide with an existing rank.
				await normalizeRoleApplicationRanks(args.delegationId, tx);
				const [existing] = await tx
					.select({ value: count() })
					.from(schema.roleApplication)
					.where(eq(schema.roleApplication.delegationId, args.delegationId));

				return tx
					.insert(schema.roleApplication)
					.values({
						delegationId: args.delegationId,
						nationId: nullToUndefined(args.nationId),
						nonStateActorId: nullToUndefined(args.nonStateActorId),
						rank: (existing?.value ?? 0) + 1
					})
					.returning()
					.then(assertFirstEntryExists);
			});

			pubsub.created();

			return db.query.roleApplication
				.findFirst(
					query(
						(await ctx.abilities.roleApplication.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteRoleApplication: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.roleApplication)
				.where(
					(await ctx.abilities.roleApplication.filter('delete')).merge({ where: { id: args.id } })
						.sql.where
				)
				.returning({
					id: schema.roleApplication.id,
					delegationId: schema.roleApplication.delegationId
				});
			if (deleted.length === 0) {
				throw new GraphQLError('Role application not found, or not yours to delete');
			}
			await normalizeRoleApplicationRanks(deleted[0].delegationId);
			pubsub.removed();
			pubsub.updated();

			return true;
		}
	}),

	swapRoleApplicationRanks: t.drizzleField({
		type: [RoleApplicationRef],
		args: {
			firstRoleApplicationId: t.arg.id({ required: true }),
			secondRoleApplicationId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const canUpdate = await ctx.abilities.roleApplication.filter('update');
			const updateFilter = (id: string) => canUpdate.merge({ where: { id } });

			await db.transaction(async (tx) => {
				const [first, second] = await Promise.all([
					tx.query.roleApplication
						.findFirst(updateFilter(args.firstRoleApplicationId).query.single)
						.then(assertFindFirstExists),
					tx.query.roleApplication
						.findFirst(updateFilter(args.secondRoleApplicationId).query.single)
						.then(assertFindFirstExists)
				]);

				// (delegationId, rank) is unique, so the first row is parked on a sentinel rank
				// before the two are swapped. The legacy resolver used -1 for the same reason.
				await tx
					.update(schema.roleApplication)
					.set({ rank: -1 })
					.where(updateFilter(args.firstRoleApplicationId).sql.where);
				await tx
					.update(schema.roleApplication)
					.set({ rank: first.rank })
					.where(updateFilter(args.secondRoleApplicationId).sql.where);
				await tx
					.update(schema.roleApplication)
					.set({ rank: second.rank })
					.where(updateFilter(args.firstRoleApplicationId).sql.where);
			});

			pubsub.updated([args.firstRoleApplicationId, args.secondRoleApplicationId]);

			return db.query.roleApplication.findMany(
				query(
					(await ctx.abilities.roleApplication.filter('read')).merge({
						where: { id: { in: [args.firstRoleApplicationId, args.secondRoleApplicationId] } }
					}).query.many
				)
			);
		}
	})
}));
