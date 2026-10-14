import { datetimeLocalToDate } from '$lib/helpers/conferenceTimezoneDate';

/**
 * The fields a survey form writes, or `undefined` while one is still empty. The deadline is a
 * `datetime-local` value in the conference's timezone.
 */
export function surveyFields(
	title: string,
	description: string,
	deadline: string,
	timezone: string
) {
	if (!title || !description || !deadline) return undefined;
	return { title, description, deadline: datetimeLocalToDate(deadline, timezone) };
}
