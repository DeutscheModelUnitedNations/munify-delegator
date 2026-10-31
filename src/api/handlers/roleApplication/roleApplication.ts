import { db } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { appendRoleApplication, removeRoleApplication, swapRanks } from './roleApplicationService';
import {
	assertCanCreateRoleApplication,
	assertCanDeleteRoleApplication,
	assertCanSwapRoleApplicationRanks,
	registerRoleApplicationAbilities
} from './roleApplicationPermissions';

registerRoleApplicationAbilities();

const RoleApplicationRef = object({ table: 'roleApplication' });
query({ table: 'roleApplication' });

schemaBuilder.mutationFields((t) => ({
	createRoleApplication: t.drizzleField({
		description: "Adds a nation or non-state actor at the end of the delegation's wishes.",
		type: RoleApplicationRef,
		args: {
			delegationId: t.arg.id({ required: true }),
			/** A nation or non-state actor of the delegation's conference. */
			roleId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			// The caller must be allowed to update the delegation the application belongs to, and the
			// role applied for must be on offer in that conference.
			await assertCanCreateRoleApplication({ ctx, args });

			const created = await appendRoleApplication(args);

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
		description: "Removes a wish from the delegation's ranking and closes the gap it leaves.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const application = await assertCanDeleteRoleApplication({ ctx, id: args.id });
			await removeRoleApplication(application);

			return true;
		}
	}),

	swapRoleApplicationRanks: t.drizzleField({
		description: 'Swaps the ranks of two wishes of the same delegation, returning both.',
		type: [RoleApplicationRef],
		args: {
			firstRoleApplicationId: t.arg.id({ required: true }),
			secondRoleApplicationId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const { first, second } = await assertCanSwapRoleApplicationRanks({
				ctx,
				firstId: args.firstRoleApplicationId,
				secondId: args.secondRoleApplicationId
			});
			await swapRanks({ first, second });

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
