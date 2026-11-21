import { assertFirstEntryExists } from '@m1212e/rumble';
import { z } from 'zod';
import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { conferenceSeriesPubsub } from '#api/pubsub';
import { apiError, isForeignKeyViolation } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

export const seriesNameSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.conferenceSeriesNameRequired() })
	.max(100, { error: () => m.conferenceSeriesNameRequired() });

/** Adds a series; returns its id. */
export async function createConferenceSeries(values: { name: string; abbreviation: string }) {
	const created = await db
		.insert(schema.conferenceSeries)
		.values(values)
		.returning({ id: schema.conferenceSeries.id })
		.then(assertFirstEntryExists);
	conferenceSeriesPubsub.created();
	return created.id;
}

/** Renames a series; left out keeps a field. */
export async function updateConferenceSeries({
	id,
	name,
	abbreviation
}: {
	id: string;
	name?: string | null;
	abbreviation?: string | null;
}) {
	await db
		.update(schema.conferenceSeries)
		.set({ name: name ?? undefined, abbreviation: abbreviation ?? undefined })
		.where(whereRows({ table: schema.conferenceSeries, filter: { id } }));
	conferenceSeriesPubsub.updated(id);
}

/** Deletes a series no conference and no guide page belongs to (CONFLICT otherwise). */
export async function deleteConferenceSeries(id: string) {
	try {
		await db
			.delete(schema.conferenceSeries)
			.where(whereRows({ table: schema.conferenceSeries, filter: { id } }));
	} catch (error) {
		if (isForeignKeyViolation(error)) {
			throw apiError({ code: 'CONFLICT', message: m.conferenceSeriesInUse() });
		}
		throw error;
	}
	conferenceSeriesPubsub.removed();
}
