import type { CalendarEntry } from './calendarTypes';

/** The part of an entry the "now and next" view needs */
type TimedEntry = Pick<CalendarEntry, 'name' | 'startTime' | 'endTime' | 'tracks' | 'room'> & {
	place?: { id: string } | null;
};

/** A track with the committees and roles whose seats it is for. */
export interface SeatTrack {
	id: string;
	committees: readonly { id: string }[];
	conferenceRoles: readonly { id: string }[];
}

/** What a timeline's line shows of an entry */
export interface TimelineEntry {
	id: string;
	name: string;
	startTime: Date;
	place?: { name: string } | null;
	room?: string | null;
}

interface DayWithTracks<E extends TimedEntry> {
	tracks: readonly SeatTrack[];
	entries: readonly E[];
}

/** Someone's seat as the tracks name it: their committee and role ids. */
export interface Seat {
	committeeIds: readonly string[];
	roleIds: readonly string[];
}

export interface UpcomingEntry<E> {
	entry: E;
	/** Whether it is on another day than the one before it in the timeline (starting with today) */
	newDay: boolean;
}

export interface Timeline<E> {
	/** Everything running right now, the one that started first at the front */
	current: E[];
	/** What starts next, soonest first */
	upcoming: UpcomingEntry<E>[];
}

/**
 * `now` as a calendar time. Entries hold wall-clock times in the conference's timezone, stored as
 * if they were UTC, so the instant has to be turned into the wall clock of that timezone first.
 */
export function wallClockNow({
	timezone,
	now = new Date()
}: {
	timezone: string;
	now?: Date;
}): number {
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

/** Whether a track is meant for someone in `seat`: for their committee or their role. */
export function isOwnTrackOf(seat: Seat) {
	const committees = new Set(seat.committeeIds);
	const roles = new Set(seat.roleIds);
	return (track: SeatTrack) =>
		track.committees.some((committee) => committees.has(committee.id)) ||
		track.conferenceRoles.some((role) => roles.has(role.id));
}

/**
 * Parallel copies of one session as one entry, on all of their tracks. A place or room they do not
 * share is left out: it is not where everyone has to be.
 */
function mergeCopies<E extends TimedEntry>(copies: readonly [E, ...E[]]): E {
	const [first, ...others] = copies;
	if (others.length === 0) return first;
	const samePlace = others.every((copy) => copy.place?.id === first.place?.id);
	const sameRoom = samePlace && others.every((copy) => copy.room === first.room);
	const trackIds = new Set(copies.flatMap((copy) => copy.tracks.map((track) => track.id)));
	return {
		...first,
		tracks: [...trackIds].map((id) => ({ id })),
		place: samePlace ? first.place : null,
		room: sameRoom ? first.room : null
	};
}

/**
 * The entries that concern someone in `seat`: the ones for every track, and the ones on a track
 * meant for their committee or role. An entry is for every track when it has none of its own or
 * when it is on all of its day's tracks, which is how shared entries are stored. Someone whose
 * seat no track is for (no seat, or a team member) gets every entry of the schedule, parallel
 * copies of one session counted once (`mergeCopies`).
 */
export function entriesForSeat<E extends TimedEntry>({
	days,
	seat
}: {
	days: readonly DayWithTracks<E>[];
	seat: Seat;
}): E[] {
	const isOwn = isOwnTrackOf(seat);
	const hasOwnTrack = days.some((day) => day.tracks.some(isOwn));
	if (!hasOwnTrack) {
		const copies = new Map<string, [E, ...E[]]>();
		for (const entry of days.flatMap((day) => day.entries)) {
			const key = `${entry.name}|${entry.startTime.getTime()}|${entry.endTime.getTime()}`;
			const known = copies.get(key);
			if (known) known.push(entry);
			else copies.set(key, [entry]);
		}
		return [...copies.values()].map(mergeCopies);
	}
	return days.flatMap((day) => {
		const own = new Set(day.tracks.filter(isOwn).map((track) => track.id));
		return day.entries.filter(
			(entry) =>
				entry.tracks.length === 0 ||
				entry.tracks.length >= day.tracks.length ||
				entry.tracks.some((track) => own.has(track.id))
		);
	});
}

/**
 * What is running now and the next `count` things to start, for a list of entries. A day marker
 * (`newDay`) sits on the first entry of every day other than the one before it, counting from today.
 */
export function timelineOf<E extends TimedEntry>({
	entries,
	timezone,
	now = new Date(),
	count = 2
}: {
	entries: readonly E[];
	timezone: string;
	now?: Date;
	count?: number;
}): Timeline<E> {
	const wall = wallClockNow({ timezone, now });
	const sorted = entries.toSorted((a, b) => a.startTime.getTime() - b.startTime.getTime());

	const current = sorted.filter(
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

/**
 * A timeline split into what it leads with and the `count` entries after it: everything running, or
 * the next thing to start when nothing is. Takes a timeline of one upcoming entry more than `count`.
 */
export function leadOfTimeline<E>({
	timeline: { current, upcoming },
	count
}: {
	timeline: Timeline<E>;
	count: number;
}) {
	const next = current.length === 0 ? upcoming.at(0) : undefined;
	const following = next ? upcoming.slice(1) : upcoming;
	return { running: current, next, following: following.slice(0, count) };
}

const MINUTE = 60 * 1000;

/**
 * How long it is until an entry starts ("in 25 minutes", "in 3 hours", "tomorrow"): hours are
 * rounded down, so nobody is told they have more time than they do; from the next day on, only the
 * days are counted.
 */
export function startsIn({
	startTime,
	timezone,
	now,
	locale
}: {
	startTime: Date;
	timezone: string;
	now: Date;
	locale: string;
}): string {
	const wall = wallClockNow({ timezone, now });
	const minutes = Math.max(0, Math.round((startTime.getTime() - wall) / MINUTE));
	const days = dayOf(startTime.getTime()) - dayOf(wall);
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	if (minutes < 60) return format.format(minutes, 'minute');
	if (days === 0) return format.format(Math.floor(minutes / 60), 'hour');
	return format.format(days, 'day');
}

/** Where an entry takes place, in one line; empty when that is not known. */
export function placeLine(entry: { place?: { name: string } | null; room?: string | null }) {
	return [entry.place?.name, entry.room].filter(Boolean).join(' · ');
}

/**
 * The seat the schedule's tracks are for: someone's committee, and their delegation's or own role.
 * Plain ids, so a timeline built on them does not subscribe to every field it touched.
 */
export function seatOf(
	participation:
		| {
				delegationMember?: {
					assignedCommittee?: { id: string } | null;
					delegation: { assignedRole?: { id: string } | null };
				} | null;
				singleParticipant?: { assignedRole?: { id: string } | null } | null;
		  }
		| undefined
): Seat {
	const committee = participation?.delegationMember?.assignedCommittee;
	const roles = [
		participation?.delegationMember?.delegation.assignedRole,
		participation?.singleParticipant?.assignedRole
	];
	return {
		committeeIds: committee ? [committee.id] : [],
		roleIds: roles.flatMap((role) => (role ? [role.id] : []))
	};
}
