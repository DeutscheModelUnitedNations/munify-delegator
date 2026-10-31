import type { CalendarEntry } from './calendarTypes';

/** The part of an entry the "now and next" view needs */
type TimedEntry = Pick<CalendarEntry, 'name' | 'startTime' | 'endTime' | 'tracks'>;

/** A track with the committees and roles whose seats it is for. */
interface SeatTrack {
	id: string;
	committees: readonly { id: string }[];
	conferenceRoles: readonly { id: string }[];
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

/**
 * The entries that concern someone in `seat`: the ones for every track, and the ones on a track
 * meant for their committee or role. An entry is for every track when it has none of its own or
 * when it is on all of its day's tracks, which is how shared entries are stored. Someone whose
 * seat no track is for (no seat, or a team member) gets every entry of the schedule, parallel
 * copies of one session counted once.
 */
export function entriesForSeat<E extends TimedEntry>({
	days,
	seat
}: {
	days: readonly DayWithTracks<E>[];
	seat: Seat;
}): E[] {
	const committees = new Set(seat.committeeIds);
	const roles = new Set(seat.roleIds);
	const isOwn = (track: SeatTrack) =>
		track.committees.some((committee) => committees.has(committee.id)) ||
		track.conferenceRoles.some((role) => roles.has(role.id));
	const hasOwnTrack = days.some((day) => day.tracks.some(isOwn));
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
