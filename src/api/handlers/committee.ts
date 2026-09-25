import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import { isTeamMemberOfConference, systemAdmin } from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/committee.ts
abilityBuilder.committee.allow('read');
abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.committee.allow(['update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, ['PROJECT_MANAGEMENT']);
	return where ? { where } : undefined;
});

export const CommitteeRef = object({ table: 'committee' });
query({ table: 'committee' });

/**
 * Only update and delete: `createOneCommittee` is commented out in the legacy resolver and does
 * not appear in schema.graphql, so it is deliberately not ported.
 */
schemaBuilder.mutationFields((t) => ({
	updateCommittee: t.drizzleField({
		type: CommitteeRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			abbreviation: t.arg.string(),
			resolutionHeadline: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.committee)
				.set({
					name: args.name ?? undefined,
					abbreviation: args.abbreviation ?? undefined,
					// Deliberately not `?? undefined`: the legacy resolver passed this straight through,
					// so sending null clears the headline rather than leaving it untouched.
					resolutionHeadline: args.resolutionHeadline
				})
				.where(
					ctx.abilities.committee.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.committee
				.findFirst(
					query(
						ctx.abilities.committee.filter('read').merge({ where: { id: args.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCommittee: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.committee)
				.where(ctx.abilities.committee.filter('delete').merge({ where: { id: args.id } }).sql.where)
				.returning({ id: schema.committee.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Committee not found, or not yours to delete');
			}
			return true;
		}
	})
}));
