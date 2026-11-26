import { client } from '#lib/api/rumbleClient/client';
import { calendarDayFields, calendarDaysOf } from '#lib/api/calendarDays';

/**
 * The conference's schedule with what decides which of it a person follows: the survey options
 * each entry is limited to, and the ones the person picked (`personalCalendarDays`).
 */
export function fetchPersonalSchedule({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	return Promise.all([
		client.liveQuery.conference({
			__args: { id: conferenceId },
			timezone: true,
			showCalendar: true
		}),
		client.liveQuery.calendarDays({
			__args: calendarDaysOf(conferenceId),
			...calendarDayFields,
			entries: { ...calendarDayFields.entries, surveyOptions: { id: true } }
		}),
		client.liveQuery.surveyAnswers({
			__args: {
				where: {
					user: { id: { eq: userId } },
					question: { conferenceId: { eq: conferenceId } }
				}
			},
			option: { id: true }
		})
	]);
}
