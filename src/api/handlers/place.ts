import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
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

const PlaceRef = object({
	table: 'place',
	adjust: (t) => ({
		// The site plan is an uploaded image as a data URL, often megabytes. Lists only need to know
		// whether there is one, so they can ask for this rather than the image itself.
		hasSitePlan: t.field({
			type: 'Boolean',
			resolve: (place) => !!place.sitePlanDataURL
		})
	})
});
query({ table: 'place' });
const pubsub = rumblePubsub({ table: 'place' });

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

			pubsub.created();

			return db.query.place
				.findFirst(
					query(
						(await ctx.abilities.place.filter('read')).merge({ where: { id: created.id } }).query
							.single
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
				// Every column but the name is nullable, so an explicit null clears it while an
				// omitted argument leaves it alone.
				.set({
					name: args.name ?? undefined,
					address: args.address,
					latitude: args.latitude,
					longitude: args.longitude,
					directions: args.directions,
					info: args.info,
					websiteUrl: args.websiteUrl,
					sitePlanDataURL: args.sitePlanDataURL
				})
				.where(
					(await ctx.abilities.place.filter('update')).merge({ where: { id: args.id } }).sql.where
				);

			pubsub.updated(args.id);

			return db.query.place
				.findFirst(
					query(
						(await ctx.abilities.place.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
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
				.where(
					(await ctx.abilities.place.filter('delete')).merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.place.id });

			if (deleted.length === 0) {
				throw new GraphQLError('Place not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
		}
	})
}));
