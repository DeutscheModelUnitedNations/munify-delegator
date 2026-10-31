import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	assertCanCreatePlace,
	assertCanDeletePlace,
	assertCanUpdatePlace,
	registerPlaceAbilities
} from './placePermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { createPlace, deletePlace, updatePlace } from './placeService';
import { latitudeSchema, longitudeSchema } from './placeRules';

registerPlaceAbilities();

const PlaceRef = object({ table: 'place' });
query({ table: 'place' });

/** The place as the caller may read it, for re-reading the row a mutation wrote. */
async function readablePlace({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.place.filter('read')).merge({ where: { id } }).query.single;
}

schemaBuilder.mutationFields((t) => {
	/** Everything about a place but its name, each optional. */
	const placeDetailArgs = () => ({
		address: t.arg.string(),
		latitude: t.arg.float({ description: 'Degrees, -90 to 90.' }).validate(latitudeSchema),
		longitude: t.arg.float({ description: 'Degrees, -180 to 180.' }).validate(longitudeSchema),
		directions: t.arg.string(),
		info: t.arg.string(),
		websiteUrl: t.arg.string(),
		sitePlanFileId: t.arg.id({
			description:
				'A file uploaded through `requestFileUpload` for the site plan of a place of this conference.'
		})
	});

	return {
		createPlace: t.drizzleField({
			description:
				"Adds a place (a venue) the conference's schedule entries can name. A name another place of the conference has is refused with CONFLICT.",
			type: PlaceRef,
			args: {
				conferenceId: t.arg.id({ required: true }),
				name: t.arg.string({ required: true }),
				...placeDetailArgs()
			},
			resolve: async (query, _root, { conferenceId, name, ...details }, ctx) => {
				await assertCanCreatePlace({
					ctx,
					conferenceId,
					sitePlanFileId: details.sitePlanFileId
				});
				const id = await createPlace({ conferenceId, name, details });

				return db.query.place
					.findFirst(query(await readablePlace({ ctx, id })))
					.then(assertFindFirstExists);
			}
		}),

		updatePlace: t.drizzleField({
			description:
				'Changes the given fields of a place; left out keeps a field, `null` clears all but the name. A name another place of the conference has is refused with CONFLICT.',
			type: PlaceRef,
			args: {
				id: t.arg.id({ required: true }),
				name: t.arg.string(),
				...placeDetailArgs()
			},
			resolve: async (query, _root, { id, name, ...details }, ctx) => {
				await assertCanUpdatePlace({ ctx, id, sitePlanFileId: details.sitePlanFileId });
				await updatePlace({ id, name, details });

				return db.query.place
					.findFirst(query(await readablePlace({ ctx, id })))
					.then(assertFindFirstExists);
			}
		}),

		deletePlace: t.field({
			description: 'Deletes a place; schedule entries at it stay, without a place.',
			type: 'Boolean',
			args: { id: t.arg.id({ required: true }) },
			resolve: async (_root, args, ctx) => {
				await assertCanDeletePlace({ ctx, id: args.id });
				await deletePlace(args.id);
				return true;
			}
		})
	};
});
