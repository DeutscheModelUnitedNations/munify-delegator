import type { RequestEvent } from '@sveltejs/kit';
import { yoga } from '#api/yoga';
import { SCHEDULE, scheduleOfResult } from './feedScheduleQuery';

/**
 * A conference's schedule as the request's caller reads it, for a calendar file. Read through the
 * API in-process, so the schedule's read rules (`showCalendar`, survey-limited entries, the
 * release of assignments) apply exactly as in the app; the subscription route makes the caller the
 * link's owner first (`locals.calendarFeedUserId`). Undefined when they may not read the conference.
 */
export async function feedSchedule({
	event,
	conferenceId,
	userId
}: {
	event: RequestEvent;
	conferenceId: string;
	userId: string;
}) {
	const envelop = yoga.getEnveloped(event);
	const result = await envelop.execute({
		schema: envelop.schema,
		document: SCHEDULE,
		variableValues: { conferenceId, userId },
		contextValue: await envelop.contextFactory()
	});
	if (Symbol.asyncIterator in result) throw new Error('Incremental delivery is not supported');
	return scheduleOfResult(result);
}
