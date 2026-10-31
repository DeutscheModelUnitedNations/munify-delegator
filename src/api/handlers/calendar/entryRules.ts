import { m } from '#lib/paraglide/messages';
import { z } from 'zod';

/** The rules of a schedule entry's arguments, free of database access so they are unit tested. */

/** Whether an entry ends after it starts; one side left out passes. */
export function endsAfterStart({
	startTime,
	endTime
}: {
	startTime?: Date | null;
	endTime?: Date | null;
}) {
	return !startTime || !endTime || endTime.getTime() > startTime.getTime();
}

/** The tracks an entry runs on: at least one. */
export const entryTrackIdsSchema = z
	.array(z.string())
	.min(1, { error: () => m.calendarEntryNeedsTrack() });

/**
 * A new entry's times: it has to end after it starts. An update is checked on the row as written
 * (`updateCalendarEntry`).
 */
export const entryTimesSchema = z
	.object({ startTime: z.date().nullish(), endTime: z.date().nullish() })
	.refine(endsAfterStart, { error: () => m.calendarEntryEndBeforeStart() });
