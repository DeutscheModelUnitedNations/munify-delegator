import { db, type Transaction, schema } from '#api/db/db';
import { calendarEntryPubsub } from '#api/pubsub';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { endsAfterStart } from './entryRules';

/** Makes `trackIds` the tracks of an entry. */
async function setTracks({
	tx,
	entryId,
	trackIds
}: {
	tx: Transaction;
	entryId: string;
	trackIds: readonly string[];
}) {
	const ids = [...new Set(trackIds)];
	await tx
		.delete(schema.calendarEntryToCalendarTrack)
		.where(whereRows({ table: schema.calendarEntryToCalendarTrack, filter: { a: entryId } }));
	if (ids.length > 0) {
		await tx
			.insert(schema.calendarEntryToCalendarTrack)
			.values(ids.map((trackId) => ({ a: entryId, b: trackId })));
	}
}

/** Makes `optionIds` the survey options an entry is limited to; none shows it to everybody. */
async function setSurveyOptions({
	tx,
	entryId,
	optionIds
}: {
	tx: Transaction;
	entryId: string;
	optionIds: readonly string[];
}) {
	const ids = [...new Set(optionIds)];
	await tx
		.delete(schema.calendarEntryToSurveyOption)
		.where(whereRows({ table: schema.calendarEntryToSurveyOption, filter: { a: entryId } }));
	if (ids.length > 0) {
		await tx
			.insert(schema.calendarEntryToSurveyOption)
			.values(ids.map((optionId) => ({ a: entryId, b: optionId })));
	}
}

/**
 * Creates an entry together with its tracks and survey options, so it never exists without them
 * (and is never shown to everybody in between). Returns its id.
 */
export async function createCalendarEntry({
	values,
	trackIds,
	surveyOptionIds
}: {
	values: typeof schema.calendarEntry.$inferInsert;
	trackIds: readonly string[];
	surveyOptionIds: readonly string[] | null | undefined;
}) {
	const created = await db.transaction(async (tx) => {
		const created = await tx
			.insert(schema.calendarEntry)
			.values(values)
			.returning({ id: schema.calendarEntry.id })
			.then(assertFirstEntryExists);
		await setTracks({ tx, entryId: created.id, trackIds });
		if (surveyOptionIds?.length)
			await setSurveyOptions({ tx, entryId: created.id, optionIds: surveyOptionIds });
		return created;
	});
	calendarEntryPubsub.created();
	return created.id;
}

/**
 * Changes an entry and, when `trackIds` or `surveyOptionIds` is given, replaces its tracks or
 * survey options in the same step. Refuses (INVALID_INPUT) an entry that ends before it starts as
 * written, which an update giving only one of the times can cause.
 */
export async function updateCalendarEntry({
	id,
	values,
	trackIds,
	surveyOptionIds
}: {
	id: string;
	values: Partial<typeof schema.calendarEntry.$inferInsert>;
	trackIds: readonly string[] | null | undefined;
	surveyOptionIds: readonly string[] | null | undefined;
}) {
	await db.transaction(async (tx) => {
		const [written] = await tx
			.update(schema.calendarEntry)
			.set(values)
			.where(whereRows({ table: schema.calendarEntry, filter: { id } }))
			.returning({
				startTime: schema.calendarEntry.startTime,
				endTime: schema.calendarEntry.endTime
			});
		if (written && !endsAfterStart(written)) {
			throw apiError({ code: 'INVALID_INPUT', message: m.calendarEntryEndBeforeStart() });
		}
		if (trackIds) await setTracks({ tx, entryId: id, trackIds });
		if (surveyOptionIds) await setSurveyOptions({ tx, entryId: id, optionIds: surveyOptionIds });
	});
	calendarEntryPubsub.updated(id);
}
