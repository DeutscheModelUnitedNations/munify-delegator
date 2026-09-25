import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import { systemAdmin } from '$api/services/authHelper';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/nation.ts: everyone can see the nations in the system.
// `list` and `read` both map to rumble's `read` - it has no separate list action, and neither
// does chase.
abilityBuilder.nation.allow('read');
abilityBuilder.nation.allow(['update', 'delete']).when(systemAdmin);

export const NationRef = object({ table: 'nation' });
query({ table: 'nation' });

/**
 * Mutation surface taken from schema.graphql: the legacy `createOneNation`
 * resolver is commented out upstream, so no create mutation is ported here.
 */
schemaBuilder.mutationFields((t) => ({
	deleteNation: t.field({
		type: 'Boolean',
		// Nation is keyed by its ISO alpha-3 code, not a generated id.
		args: { alpha3Code: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.nation)
				.where(
					ctx.abilities.nation.filter('delete').merge({ where: { alpha3Code: args.alpha3Code } })
						.sql.where
				)
				.returning({ alpha3Code: schema.nation.alpha3Code });
			if (deleted.length === 0) {
				throw new GraphQLError('Nation not found, or not yours to delete');
			}
			return true;
		}
	})
}));
