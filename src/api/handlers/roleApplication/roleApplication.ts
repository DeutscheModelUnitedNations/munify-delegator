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
		description:
			"Adds a role at the end of the delegation's wishes: the head delegate until the delegation has applied, or participant care. A role the delegation already wishes for answers CONFLICT.",
		type: RoleApplicationRef,
		args: {
			delegationId: t.arg.id({ required: true }),
			roleId: t.arg.id({
				required: true,
				description: "A nation or non-state actor of the delegation's conference."
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateRoleApplication({ ctx, args });
			const id = await appendRoleApplication(args);

			return db.query.roleApplication
				.findFirst(
					query(
						(await ctx.abilities.roleApplication.filter('read')).merge({ where: { id } }).query
							.single
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
		description: 'Swaps the ranks of two wishes of the same delegation, answering with both.',
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
						where: { id: { in: [first.id, second.id] } }
					}).query.many
				)
			);
		}
	})
}));
