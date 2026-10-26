import { db } from '#api/db/db.js';
import { object, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { appendRoleApplication, removeRoleApplication, swapRanks } from './roleApplicationService';
import {
	assertCanCreateRoleApplication,
	assertCanDeleteRoleApplication,
	assertCanSwapRoleApplicationRanks,
	registerRoleApplicationAbilities
} from './roleApplicationPermissions';
import { roleApplicationPubsub } from '#api/pubsub.js';

registerRoleApplicationAbilities();

const RoleApplicationRef = object({ table: 'roleApplication' });
query({ table: 'roleApplication' });

schemaBuilder.mutationFields((t) => ({
	createRoleApplication: t.drizzleField({
		type: RoleApplicationRef,
		args: {
			delegationId: t.arg.id({ required: true }),
			/** A nation or non-state actor of the delegation's conference. */
			roleId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			// The caller must be allowed to update the delegation the application belongs to, and the
			// role applied for must be on offer in that conference.
			await assertCanCreateRoleApplication(ctx, args);

			const created = await appendRoleApplication(args);

			roleApplicationPubsub.created();

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
			const application = await assertCanDeleteRoleApplication(ctx, args.id);
			await removeRoleApplication(application);
			roleApplicationPubsub.removed();
			roleApplicationPubsub.updated();

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
			const [first, second] = await assertCanSwapRoleApplicationRanks(
				ctx,
				args.firstRoleApplicationId,
				args.secondRoleApplicationId
			);
			await swapRanks(first, second);

			roleApplicationPubsub.updated([args.firstRoleApplicationId, args.secondRoleApplicationId]);

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
