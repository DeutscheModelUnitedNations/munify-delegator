import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import { isTeamMemberOfConference, systemAdmin } from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/customConferenceRole.ts
abilityBuilder.customConferenceRole.allow('read');
abilityBuilder.customConferenceRole.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.customConferenceRole.allow(['update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, ['PROJECT_MANAGEMENT']);
	return where ? { where } : undefined;
});

export const CustomConferenceRoleRef = object({ table: 'customConferenceRole' });
query({ table: 'customConferenceRole' });

/**
 * Mutation surface taken from schema.graphql: the legacy `createOneCustomConferenceRole`
 * resolver is commented out upstream, so no create mutation is ported here.
 */
schemaBuilder.mutationFields((t) => ({
	updateCustomConferenceRole: t.drizzleField({
		type: CustomConferenceRoleRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			description: t.arg.string(),
			fontAwesomeIcon: t.arg.string(),
			seatAmount: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.customConferenceRole)
				.set({
					name: args.name ?? undefined,
					description: args.description ?? undefined,
					fontAwesomeIcon: args.fontAwesomeIcon ?? undefined,
					seatAmount: args.seatAmount ?? undefined
				})
				.where(
					ctx.abilities.customConferenceRole.filter('update').merge({ where: { id: args.id } }).sql
						.where
				);

			return db.query.customConferenceRole
				.findFirst(
					query(
						ctx.abilities.customConferenceRole.filter('read').merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCustomConferenceRole: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.customConferenceRole)
				.where(
					ctx.abilities.customConferenceRole.filter('delete').merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.customConferenceRole.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Custom conference role not found, or not yours to delete');
			}
			return true;
		}
	})
}));
