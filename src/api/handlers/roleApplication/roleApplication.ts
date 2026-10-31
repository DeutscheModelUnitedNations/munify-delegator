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
import { roleApplicationPubsub } from '#api/pubsub';
import { queryAllowed } from '#api/services/authHelper/utils';

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
			await assertCanCreateRoleApplication({ ctx, args });

			const created = await appendRoleApplication(args);

			roleApplicationPubsub.created();

			return db.query.roleApplication
				.findFirst(
					query(await queryAllowed({ ability: ctx.abilities.roleApplication, id: created.id }))
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteRoleApplication: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const application = await assertCanDeleteRoleApplication({ ctx, id: args.id });
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
			const [first, second] = await assertCanSwapRoleApplicationRanks({
				ctx,
				firstId: args.firstRoleApplicationId,
				secondId: args.secondRoleApplicationId
			});
			await swapRanks({ first, second });

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
