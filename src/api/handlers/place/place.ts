import { db, schema } from '#api/db/db.js';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble.js';
import { eq } from 'drizzle-orm';
import {
	assertCanCreatePlace,
	assertCanUpdatePlace,
	deletablePlaceWhere,
	registerPlaceAbilities
} from './placePermissions';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { placePubsub } from '#api/pubsub.js';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';

registerPlaceAbilities();

const PlaceRef = object({ table: 'place' });
query({ table: 'place' });

type ArgBuilder = Pick<
	PothosSchemaTypes.InputFieldBuilder<(typeof schemaBuilder)['$inferSchemaTypes'], 'Arg'>,
	'id' | 'string' | 'float'
>;

/** Everything about a place but its name, each optional. */
const placeDetailArgs = (arg: ArgBuilder) => ({
	address: arg.string(),
	latitude: arg.float(),
	longitude: arg.float(),
	directions: arg.string(),
	info: arg.string(),
	websiteUrl: arg.string(),
	/** A file uploaded through `requestFileUpload`. */
	sitePlanFileId: arg.id()
});

/** The place with this id, as far as the caller may read it. */
const readablePlace = async (ctx: ApiContext, id: string) =>
	(await ctx.abilities.place.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createPlace: t.drizzleField({
		type: PlaceRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			...placeDetailArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreatePlace(ctx, args.conferenceId, args.sitePlanFileId);

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
					sitePlanFileId: (await ensureUploadComplete(args.sitePlanFileId)) ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			placePubsub.created();

			return db.query.place
				.findFirst(query(await readablePlace(ctx, created.id)))
				.then(assertFindFirstExists);
		}
	}),

	updatePlace: t.drizzleField({
		type: PlaceRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			...placeDetailArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdatePlace(ctx, args.id, args.sitePlanFileId);
			const sitePlanFileId = await ensureUploadComplete(args.sitePlanFileId);

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
					sitePlanFileId
				})
				.where(eq(schema.place.id, args.id));

			placePubsub.updated(args.id);

			return db.query.place
				.findFirst(query(await readablePlace(ctx, args.id)))
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
				.where(await deletablePlaceWhere(ctx, args.id))
				.returning({ id: schema.place.id });

			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			placePubsub.removed();

			return true;
		}
	})
}));
