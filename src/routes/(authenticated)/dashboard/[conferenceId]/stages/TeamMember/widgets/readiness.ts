import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';

/**
 * The readiness widget's checklist: what a conference needs before its registration opens (in
 * `PRE`) and before it takes place (in `PREPARATION`), each item done or open, from facts the
 * widget reads. Pure, so which items a stage asks for and when one counts as done are tested.
 */

export type ReadinessItemId =
	| 'committees'
	| 'applicationDeadline'
	| 'fee'
	| 'bankDetails'
	| 'documents'
	| 'guide'
	| 'calendar'
	| 'discussionPoints'
	| 'certificate'
	| 'checkSession'
	| 'chase';

/** Where an item is done: a team page by its route id, and the part of it */
export interface ReadinessTarget {
	routeId: string;
	/** A path below the conference's dashboard */
	path: string;
	query?: string;
}

export interface ReadinessItem {
	id: ReadinessItemId;
	done: boolean;
	target: ReadinessTarget;
	/** How many are still missing, where the item counts something */
	missing?: number;
}

export interface ReadinessFacts {
	committeeSeats: number;
	applicationDeadline: Date | string;
	feeAmount?: number | null;
	iban?: string | null;
	contractFileId?: string | null;
	guidePublished: boolean;
	startConference: Date | string;
	endConference: Date | string;
	/** The days of the conference's schedule */
	calendarDays: readonly (Date | string)[];
	/** For each agenda item, how many points for discussion it has */
	discussionPointCounts: readonly number[];
	certificateFileId?: string | null;
	checkSessions: number;
	/** Undefined while no CHASE is linked */
	chase?: { reconciled: boolean; keptBackPapers: number };
}

const SETTINGS = (tab: string): ReadinessTarget => ({
	routeId: 'settings',
	path: 'team/configuration',
	query: `tab=${tab}`
});

/** A day as `YYYY-MM-DD` in UTC; the schedule's days and the conference's dates are calendar days. */
const dayKey = (day: Date | string) => new Date(day).toISOString().slice(0, 10);

/** The calendar days from the conference's start to its end, both included. */
export function conferenceDays({ start, end }: { start: Date | string; end: Date | string }) {
	const days: string[] = [];
	const cursor = new Date(dayKey(start));
	const last = new Date(dayKey(end)).getTime();
	while (cursor.getTime() <= last && days.length < 60) {
		days.push(dayKey(cursor));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return days;
}

/** The checklist of a stage; empty for a stage that has none. */
export function readinessChecks({
	state,
	facts,
	now
}: {
	state: ConferencestateEnum;
	facts: ReadinessFacts;
	now: Date;
}): ReadinessItem[] {
	if (state === 'PRE' || state === 'PARTICIPANT_REGISTRATION') {
		return [
			{
				id: 'committees',
				done: facts.committeeSeats > 0,
				target: { routeId: 'seatPlanning', path: 'team/seat-planning' }
			},
			{
				id: 'applicationDeadline',
				done: new Date(facts.applicationDeadline).getTime() > now.getTime(),
				target: SETTINGS('general')
			},
			{ id: 'fee', done: (facts.feeAmount ?? 0) > 0, target: SETTINGS('payments') },
			{ id: 'bankDetails', done: !!facts.iban, target: SETTINGS('payments') },
			{ id: 'documents', done: !!facts.contractFileId, target: SETTINGS('documents') }
		];
	}
	if (state !== 'PREPARATION') return [];

	const scheduled = new Set(facts.calendarDays.map(dayKey));
	const missingDays = conferenceDays({
		start: facts.startConference,
		end: facts.endConference
	}).filter((day) => !scheduled.has(day)).length;
	const withoutPoints = facts.discussionPointCounts.filter((count) => count === 0).length;

	return [
		{
			id: 'guide',
			done: facts.guidePublished,
			target: { routeId: 'guide', path: 'team/guide' }
		},
		{
			id: 'calendar',
			done: missingDays === 0,
			missing: missingDays,
			target: { routeId: 'calendar', path: 'team/calendar' }
		},
		{
			id: 'discussionPoints',
			done: facts.discussionPointCounts.length > 0 && withoutPoints === 0,
			missing: facts.discussionPointCounts.length === 0 ? undefined : withoutPoints,
			target: { routeId: 'committees', path: 'team/committees' }
		},
		{ id: 'certificate', done: !!facts.certificateFileId, target: SETTINGS('documents') },
		{
			id: 'checkSession',
			done: facts.checkSessions > 0,
			target: { routeId: 'attendance', path: 'team/attendance' }
		},
		...(facts.chase
			? [
					{
						id: 'chase' as const,
						done: facts.chase.reconciled && facts.chase.keptBackPapers === 0,
						missing: facts.chase.keptBackPapers || undefined,
						target: { routeId: 'paperHub', path: 'paperhub' }
					}
				]
			: [])
	];
}
