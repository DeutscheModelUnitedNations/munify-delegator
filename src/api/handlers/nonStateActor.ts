import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import { isTeamMemberOfConference, systemAdmin } from '$api/services/authHelper';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/nonStateActor.ts
abilityBuilder.nonStateActor.allow('read');
abilityBuilder.nonStateActor.allow(['update', 'delete']).when(systemAdmin);

// Only the project management of the conference the NSA belongs to may change it.
abilityBuilder.nonStateActor.allow(['update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, ['PROJECT_MANAGEMENT']);
	return where ? { where } : undefined;
});

export const NonStateActorRef = object({ table: 'nonStateActor' });
query({ table: 'nonStateActor' });

/**
 * Mutation surface taken from schema.graphql: the legacy `createOneNonStateActor`
 * resolver is commented out upstream, so no create mutation is ported here.
 */
schemaBuilder.mutationFields((t) => ({
	deleteNonStateActor: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.nonStateActor)
				.where(
					ctx.abilities.nonStateActor.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.nonStateActor.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Non state actor not found, or not yours to delete');
			}
			return true;
		}
	})
}));
