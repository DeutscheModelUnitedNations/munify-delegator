import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { count, eq } from 'drizzle-orm';

// Ported from abilities/entities/roleApplication.ts
abilityBuilder.roleApplication.allow(['read', 'update', 'delete']).when(systemAdmin);

// Participant care and project management see their conference's applications.
abilityBuilder.roleApplication.allow('read').when((ctx) => {
	const delegation = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return delegation ? { where: { delegation } } : undefined;
});

// Delegation members see their own delegation's applications.
abilityBuilder.roleApplication.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { delegation: { members: { user: { id } } } } } : undefined;
});

// Only the head delegate may change them.
abilityBuilder.roleApplication.allow(['update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id
		? { where: { delegation: { members: { user: { id }, isHeadDelegate: true } } } }
		: undefined;
});

// Supervisors see the applications of the delegations they supervise.
abilityBuilder.roleApplication.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { delegation: { members: { supervisors: { user: { id } } } } } } : undefined;
});

export const RoleApplicationRef = object({ table: 'roleApplication' });
query({ table: 'roleApplication' });

schemaBuilder.mutationFields((t) => ({
	createRoleApplication: t.drizzleField({
		type: RoleApplicationRef,
		args: {
			delegationId: t.arg.id({ required: true }),
			nationId: t.arg.id(),
			nonStateActorId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			if (!args.nationId && !args.nonStateActorId) {
				throw new GraphQLError('Either nationId or nonStateActorId must be provided');
			}
			if (args.nationId && args.nonStateActorId) {
				throw new GraphQLError('Only one of nationId or nonStateActorId can be provided');
			}

			// The caller must be allowed to update the delegation the application belongs to.
			await db.query.delegation
				.findFirst(
					ctx.abilities.delegation.filter('update').merge({ where: { id: args.delegationId } })
						.query.single
				)
				.then(assertFindFirstExists);

			// Rank is assigned as "one past the current count", matching the legacy resolver.
			const [existing] = await db
				.select({ value: count() })
				.from(schema.roleApplication)
				.where(eq(schema.roleApplication.delegationId, args.delegationId));

			const created = await db
				.insert(schema.roleApplication)
				.values({
					delegationId: args.delegationId,
					nationId: args.nationId ?? undefined,
					nonStateActorId: args.nonStateActorId ?? undefined,
					rank: (existing?.value ?? 0) + 1
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.roleApplication
				.findFirst(
					query(
						ctx.abilities.roleApplication.filter('read').merge({ where: { id: created.id } }).query
							.single
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
					ctx.abilities.roleApplication.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.roleApplication.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Role application not found, or not yours to delete');
			}
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
			const updateFilter = (id: string) =>
				ctx.abilities.roleApplication.filter('update').merge({ where: { id } });

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

			return db.query.roleApplication.findMany(
				query(
					ctx.abilities.roleApplication.filter('read').merge({
						where: { id: { in: [args.firstRoleApplicationId, args.secondRoleApplicationId] } }
					}).query.many
				)
			);
		}
	})
}));
