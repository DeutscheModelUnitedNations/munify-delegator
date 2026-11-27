import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';

/**
 * The timeline widget's dates: what the conference's own dates and its surveys' deadlines say is
 * done and what comes next, and when the team should move the conference on to its next state
 * (the state changes only by hand). Pure, so the order and the rules are tested.
 */

type Day = Date | string;

export interface TimelineConference {
	state: ConferencestateEnum;
	applicationDeadline: Day;
	registrationDeadlineGracePeriodMinutes: number;
	paymentDeadline?: Day | null;
	assignmentReleased: boolean;
	assignmentReleasedAt?: Day | null;
	startConference: Day;
	endConference: Day;
}

export interface TimelineSurvey {
	id: string;
	title: string;
	deadline: Day;
	/** People holding a seat who have not answered; null for whoever may not know */
	unanswered?: number | null;
}

export type MilestoneKind =
	| 'applicationDeadline'
	| 'paymentDeadline'
	| 'assignmentReleased'
	| 'surveyDeadline'
	| 'conferenceStart'
	| 'conferenceEnd';

export interface Milestone {
	key: string;
	kind: MilestoneKind;
	at: Date;
	done: boolean;
	/** A survey's deadline: the survey */
	survey?: TimelineSurvey;
}

export const STATE_ORDER: readonly ConferencestateEnum[] = [
	'PRE',
	'PARTICIPANT_REGISTRATION',
	'PREPARATION',
	'ACTIVE',
	'POST'
];

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Every dated milestone of the conference, in order; those passed by `now` are done. */
export function milestonesOf({
	conference,
	surveys,
	now
}: {
	conference: TimelineConference;
	surveys: readonly TimelineSurvey[];
	now: Date;
}): Milestone[] {
	const at = (day: Day) => new Date(day);
	const entries: Omit<Milestone, 'done'>[] = [
		{
			key: 'applicationDeadline',
			kind: 'applicationDeadline',
			at: new Date(
				at(conference.applicationDeadline).getTime() +
					conference.registrationDeadlineGracePeriodMinutes * MINUTE
			)
		},
		...(conference.paymentDeadline
			? [
					{
						key: 'paymentDeadline',
						kind: 'paymentDeadline' as const,
						at: at(conference.paymentDeadline)
					}
				]
			: []),
		...(conference.assignmentReleased && conference.assignmentReleasedAt
			? [
					{
						key: 'assignmentReleased',
						kind: 'assignmentReleased' as const,
						at: at(conference.assignmentReleasedAt)
					}
				]
			: []),
		...surveys.map((survey) => ({
			key: `survey:${survey.id}`,
			kind: 'surveyDeadline' as const,
			at: at(survey.deadline),
			survey
		})),
		{ key: 'conferenceStart', kind: 'conferenceStart', at: at(conference.startConference) },
		{ key: 'conferenceEnd', kind: 'conferenceEnd', at: at(conference.endConference) }
	];
	return entries
		.map((entry) => ({ ...entry, done: entry.at.getTime() <= now.getTime() }))
		.toSorted((a, b) => a.at.getTime() - b.at.getTime());
}

/** What the widget shows: the latest milestone done and the next few. */
export function visibleMilestones({
	milestones,
	upcoming = 3
}: {
	milestones: readonly Milestone[];
	upcoming?: number;
}) {
	const done = milestones.filter((milestone) => milestone.done);
	const next = milestones.filter((milestone) => !milestone.done).slice(0, upcoming);
	return [...done.slice(-1), ...next];
}

/** Calendar days from `now` to `at` in the local time zone: 0 today, 1 tomorrow, -1 yesterday. */
export function calendarDaysUntil({ at, now }: { at: Date; now: Date }) {
	const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
	return Math.round((startOf(at).getTime() - startOf(now).getTime()) / DAY);
}

/**
 * The state the conference is due to move on to, by its dates: preparation once the applications
 * closed, the conference from a day before it starts, the wrap-up once it ended. Undefined while
 * the current state still fits.
 */
export function dueNextState({
	conference,
	now
}: {
	conference: TimelineConference;
	now: Date;
}): ConferencestateEnum | undefined {
	const time = now.getTime();
	const deadline =
		new Date(conference.applicationDeadline).getTime() +
		conference.registrationDeadlineGracePeriodMinutes * MINUTE;
	// The conference's dates are days: compared by calendar day, so a start or end stored at
	// midnight counts for the whole day
	const daysToStart = calendarDaysUntil({ at: new Date(conference.startConference), now });
	const daysToEnd = calendarDaysUntil({ at: new Date(conference.endConference), now });
	switch (conference.state) {
		case 'PARTICIPANT_REGISTRATION':
			return time > deadline ? 'PREPARATION' : undefined;
		case 'PREPARATION':
			return daysToStart <= 1 ? 'ACTIVE' : undefined;
		case 'ACTIVE':
			return daysToEnd < 0 ? 'POST' : undefined;
		default:
			return undefined;
	}
}

/** When a milestone is, as the widget words it */
export type MilestoneWhen =
	{ kind: 'done' } | { kind: 'today' } | { kind: 'tomorrow' } | { kind: 'inDays'; days: number };

export function whenOf({ milestone, now }: { milestone: Milestone; now: Date }): MilestoneWhen {
	if (milestone.done) return { kind: 'done' };
	const days = calendarDaysUntil({ at: milestone.at, now });
	if (days <= 0) return { kind: 'today' };
	return days === 1 ? { kind: 'tomorrow' } : { kind: 'inDays', days };
}

/** What the caller may see behind an open milestone */
export interface MilestoneSight {
	/** People not paid yet, for whoever opens the payments; undefined otherwise */
	unpaid?: number;
	seesPayments: boolean;
	seesSurveys: boolean;
}

/** The number behind an open milestone, where the caller may see one and it is not zero */
export function detailOf({
	milestone,
	sight
}: {
	milestone: Milestone;
	sight: MilestoneSight;
}): { kind: 'unpaid' | 'unanswered'; count: number } | undefined {
	if (milestone.done) return undefined;
	const count =
		milestone.kind === 'paymentDeadline'
			? sight.unpaid
			: milestone.kind === 'surveyDeadline' && sight.seesSurveys
				? (milestone.survey?.unanswered ?? undefined)
				: undefined;
	if (!count) return undefined;
	return { kind: milestone.kind === 'paymentDeadline' ? 'unpaid' : 'unanswered', count };
}

/** Where a milestone links to: the payments page, or its survey, where the caller may open it */
export function linkOf({
	milestone,
	sight
}: {
	milestone: Milestone;
	sight: MilestoneSight;
}): { page: 'payments' } | { page: 'survey'; surveyId: string } | undefined {
	if (milestone.kind === 'paymentDeadline' && sight.seesPayments) return { page: 'payments' };
	if (milestone.survey && sight.seesSurveys)
		return { page: 'survey', surveyId: milestone.survey.id };
	return undefined;
}
