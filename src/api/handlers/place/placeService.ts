import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { calendarEntryPubsub, placePubsub } from '#api/pubsub';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/** Everything about a place but its name and conference; left out keeps, `null` clears. */
interface PlaceDetails {
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	directions?: string | null;
	info?: string | null;
	websiteUrl?: string | null;
	sitePlanFileId?: string | null;
}

/** Turns the unique index on the conference's place names into CONFLICT. */
async function refusingTakenName<T>(write: Promise<T>) {
	try {
		return await write;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'name' })) {
			throw apiError({ code: 'CONFLICT', message: m.placeNameTaken() });
		}
		throw error;
	}
}

/**
 * Adds a place to the conference; a name another place of it has is refused (CONFLICT). A site
 * plan has to have arrived in full. Returns its id.
 */
export async function createPlace({
	conferenceId,
	name,
	details
}: {
	conferenceId: string;
	name: string;
	details: PlaceDetails;
}) {
	const created = await refusingTakenName(
		db
			.insert(schema.place)
			.values({
				conferenceId,
				name,
				address: details.address,
				latitude: details.latitude,
				longitude: details.longitude,
				directions: details.directions,
				info: details.info,
				websiteUrl: details.websiteUrl,
				sitePlanFileId: await ensureUploadComplete(details.sitePlanFileId)
			})
			.returning({ id: schema.place.id })
			.then(assertFirstEntryExists)
	);
	placePubsub.created();
	return created.id;
}

/**
 * Changes the given fields of a place: left out keeps a field, `null` clears all but the name. A
 * name another place of the conference has is refused (CONFLICT); a site plan has to have arrived
 * in full.
 */
export async function updatePlace({
	id,
	name,
	details
}: {
	id: string;
	name?: string | null;
	details: PlaceDetails;
}) {
	const sitePlanFileId = await ensureUploadComplete(details.sitePlanFileId);
	await refusingTakenName(
		db
			.update(schema.place)
			.set({
				name: name ?? undefined,
				address: details.address,
				latitude: details.latitude,
				longitude: details.longitude,
				directions: details.directions,
				info: details.info,
				websiteUrl: details.websiteUrl,
				sitePlanFileId
			})
			.where(whereRows({ table: schema.place, filter: { id } }))
	);
	placePubsub.updated(id);
}

/** Deletes a place; the schedule entries at it stay, without a place, and are announced so. */
export async function deletePlace(id: string) {
	const entryIds = await db.transaction(async (tx) => {
		const entries = await tx.query.calendarEntry.findMany({
			where: { placeId: id },
			columns: { id: true }
		});
		await tx.delete(schema.place).where(whereRows({ table: schema.place, filter: { id } }));
		return entries.map((entry) => entry.id);
	});
	placePubsub.removed();
	if (entryIds.length > 0) calendarEntryPubsub.updated(entryIds);
}
