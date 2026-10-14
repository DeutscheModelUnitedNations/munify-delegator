import type { CalendarEntry } from './calendarTypes';

/** The part of an entry the "now and next" view needs */
type TimedEntry = Pick<CalendarEntry, 'name' | 'startTime' | 'endTime' | 'tracks'>;

interface DayWithTracks<E extends TimedEntry> {
	tracks: { id: string; name: string }[];
	entries: readonly E[];
}

export interface UpcomingEntry<E extends TimedEntry> {
	entry: E;
	/** Whether it is on another day than the one before it in the timeline (starting with today) */
	newDay: boolean;
}

export interface Timeline<E extends TimedEntry> {
	/** What is running right now, if anything */
	current?: E;
	/** What starts next, soonest first */
	upcoming: UpcomingEntry<E>[];
}

/**
 * `now` as a calendar time. Entries hold wall-clock times in the conference's timezone, stored as
 * if they were UTC, so the instant has to be turned into the wall clock of that timezone first.
 */
export function wallClockNow(timezone: string, now = new Date()): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		hourCycle: 'h23'
	}).formatToParts(now);
	const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
}

const DAY = 24 * 60 * 60 * 1000;
const dayOf = (time: number) => Math.floor(time / DAY);

/** Track names compare without case, accents' worth of spacing or punctuation noise */
const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * The entries that concern someone whose seat is called `seatNames` (their committee's name and
 * abbreviation, their role, ...): the ones for every track, and the ones on a track of that name.
 * An entry is for every track when it has none of its own or when it is on all of its day's
 * tracks, which is how shared entries are stored. Tracks belong to a day, so they are matched by
 * name, not by id. Someone whose seat matches no track (no seat, or a team member) gets every
 * entry of the schedule, parallel copies of one session counted once.
 */
export function entriesForSeat<E extends TimedEntry>(
	days: readonly DayWithTracks<E>[],
	seatNames: readonly string[]
): E[] {
	const seats = new Set(seatNames.map(normalize));
	const hasOwnTrack = days.some((day) =>
		day.tracks.some((track) => seats.has(normalize(track.name)))
	);
	if (!hasOwnTrack) {
		const seen = new Set<string>();
		return days
			.flatMap((day) => day.entries)
			.filter((entry) => {
				const key = `${entry.name}|${entry.startTime.getTime()}|${entry.endTime.getTime()}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
	}
	return days.flatMap((day) => {
		const trackNames = new Map(day.tracks.map((track) => [track.id, normalize(track.name)]));
		return day.entries.filter(
			(entry) =>
				entry.tracks.length === 0 ||
				entry.tracks.length >= day.tracks.length ||
				entry.tracks.some((track) => seats.has(trackNames.get(track.id) ?? ''))
		);
	});
}

/**
 * What is running now and the next `count` things to start, for a list of entries. A day marker
 * (`newDay`) sits on the first entry of every day other than the one before it, counting from today.
 */
export function timelineOf<E extends TimedEntry>(
	entries: readonly E[],
	timezone: string,
	now = new Date(),
	count = 2
): Timeline<E> {
	const wall = wallClockNow(timezone, now);
	const sorted = entries.toSorted((a, b) => a.startTime.getTime() - b.startTime.getTime());

	const current = sorted.find(
		(entry) => entry.startTime.getTime() <= wall && wall < entry.endTime.getTime()
	);

	let previousDay = dayOf(wall);
	const upcoming = sorted
		.filter((entry) => entry.startTime.getTime() > wall)
		.slice(0, count)
		.map((entry) => {
			const day = dayOf(entry.startTime.getTime());
			const newDay = day !== previousDay;
			previousDay = day;
			return { entry, newDay };
		});

	return { current, upcoming };
}

interface Named {
	name: string;
	abbreviation?: string | null;
}

/**
 * What the schedule's tracks are named after for someone's seat: their committee, non-state
 * actor or role, by name and abbreviation. Plain strings, so a timeline built on them does not
 * subscribe to every field it touched.
 */
export function seatNamesOf(
	participation:
		| {
				delegationMember?: {
					assignedCommittee?: Named | null;
					delegation: { assignedNonStateActor?: Named | null };
				} | null;
				singleParticipant?: { assignedRole?: { name: string } | null } | null;
		  }
		| undefined
): string[] {
	const committee = participation?.delegationMember?.assignedCommittee;
	const actor = participation?.delegationMember?.delegation.assignedNonStateActor;
	const role = participation?.singleParticipant?.assignedRole;
	return [
		committee?.name,
		committee?.abbreviation,
		actor?.name,
		actor?.abbreviation,
		role?.name
	].filter((name) => name !== undefined && name !== null);
}
