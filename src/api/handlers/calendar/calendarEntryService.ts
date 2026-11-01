import { db, schema } from '#api/db/db';
import { calendarEntryPubsub } from '#api/pubsub';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { replaceLinks } from '#api/db/replaceLinks';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { endsAfterStart } from './entryRules';

/**
 * Creates an entry with its tracks and survey options in one transaction, so it is never visible
 * to everybody before its survey options are set. Returns its id.
 */
export async function createCalendarEntry({
	values,
	trackIds,
	surveyOptionIds
}: {
	values: typeof schema.calendarEntry.$inferInsert;
	trackIds: readonly string[];
	/** Limits the entry to those who picked one; none shows it to everybody. */
	surveyOptionIds: readonly string[] | null | undefined;
}) {
	const created = await db.transaction(async (tx) => {
		const created = await tx
			.insert(schema.calendarEntry)
			.values(values)
			.returning({ id: schema.calendarEntry.id })
			.then(assertFirstEntryExists);
		await replaceLinks({
			tx,
			table: schema.calendarEntryToCalendarTrack,
			aId: created.id,
			bIds: trackIds
		});
		if (surveyOptionIds?.length) {
			await replaceLinks({
				tx,
				table: schema.calendarEntryToSurveyOption,
				aId: created.id,
				bIds: surveyOptionIds
			});
		}
		return created;
	});
	calendarEntryPubsub.created();
	return created.id;
}

/**
 * Writes the given columns of an entry. `trackIds` and `surveyOptionIds` each replace their links
 * whole when given (`[]` survey options shows the entry to everybody); left out or `null` keeps them.
 * Refuses (INVALID_INPUT) an entry that ends before it starts as written, which an update giving
 * only one of the times can cause.
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
		if (trackIds) {
			await replaceLinks({
				tx,
				table: schema.calendarEntryToCalendarTrack,
				aId: id,
				bIds: trackIds
			});
		}
		if (surveyOptionIds) {
			await replaceLinks({
				tx,
				table: schema.calendarEntryToSurveyOption,
				aId: id,
				bIds: surveyOptionIds
			});
		}
	});
	calendarEntryPubsub.updated(id);
}
