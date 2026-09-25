import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageConference,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/place.ts
abilityBuilder.place.allow('read');
abilityBuilder.place.allow(['update', 'delete']).when(systemAdmin);

abilityBuilder.place.allow(['update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

export const PlaceRef = object({ table: 'place' });
query({ table: 'place' });

schemaBuilder.mutationFields((t) => ({
	createPlace: t.drizzleField({
		type: PlaceRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			address: t.arg.string(),
			latitude: t.arg.float(),
			longitude: t.arg.float(),
			directions: t.arg.string(),
			info: t.arg.string(),
			websiteUrl: t.arg.string(),
			sitePlanDataURL: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertMayManageConference(args.conferenceId, ctx.oidc.user?.sub);

			const created = await db
				.insert(schema.place)
				.values({
					conferenceId: args.conferenceId,
					name: args.name,
					address: args.address ?? undefined,
					latitude: args.latitude ?? undefined,
					longitude: args.longitude ?? undefined,
					directions: args.directions ?? undefined,
					info: args.info ?? undefined,
					websiteUrl: args.websiteUrl ?? undefined,
					sitePlanDataURL: args.sitePlanDataURL ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.place
				.findFirst(
					query(
						ctx.abilities.place.filter('read').merge({ where: { id: created.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updatePlace: t.drizzleField({
		type: PlaceRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			address: t.arg.string(),
			latitude: t.arg.float(),
			longitude: t.arg.float(),
			directions: t.arg.string(),
			info: t.arg.string(),
			websiteUrl: t.arg.string(),
			sitePlanDataURL: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.place)
				.set({
					name: args.name ?? undefined,
					address: args.address ?? undefined,
					latitude: args.latitude ?? undefined,
					longitude: args.longitude ?? undefined,
					directions: args.directions ?? undefined,
					info: args.info ?? undefined,
					websiteUrl: args.websiteUrl ?? undefined,
					sitePlanDataURL: args.sitePlanDataURL ?? undefined
				})
				.where(ctx.abilities.place.filter('update').merge({ where: { id: args.id } }).sql.where);

			return db.query.place
				.findFirst(
					query(ctx.abilities.place.filter('read').merge({ where: { id: args.id } }).query.single)
				)
				.then(assertFindFirstExists);
		}
	}),

	deletePlace: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			// The ability filter is part of the WHERE clause, so an unauthorized caller simply
			// deletes nothing. Report that honestly instead of returning `true` regardless: the
			// legacy resolver raised a not-found error in exactly this case, and silently telling a
			// caller their delete succeeded is worse than either.
			const deleted = await db
				.delete(schema.place)
				.where(ctx.abilities.place.filter('delete').merge({ where: { id: args.id } }).sql.where)
				.returning({ id: schema.place.id });

			if (deleted.length === 0) {
				throw new GraphQLError('Place not found, or not yours to delete');
			}
			return true;
		}
	})
}));
