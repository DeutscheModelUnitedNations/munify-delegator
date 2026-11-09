import { isOwnTrackOf, type Seat, type SeatTrack } from './calendarNow';
import type { CalendarDay, CalendarEntry, CalendarTrack } from './calendarTypes';

type PersonalTrack = CalendarTrack & SeatTrack;
/** An entry with the survey choices it is limited to; none means it is for everybody. */
type PersonalEntry = CalendarEntry & { surveyOptions: readonly { id: string }[] };

export interface PersonalDay extends Omit<CalendarDay, 'tracks' | 'entries'> {
	tracks: PersonalTrack[];
	entries: PersonalEntry[];
}

/**
 * The schedule as one person reads it, for the team to look up where they have to be: only the
 * entries their survey choices let them read (as the API's read rules do for them). Every track
 * stays, so the team can look at the others; `ownTrackIds` names the ones to preselect. Tracks and
 * entries come in the order they are shown.
 */
export function personalCalendarDays({
	days,
	pickedOptionIds
}: {
	days: readonly PersonalDay[];
	pickedOptionIds: readonly string[];
}): PersonalDay[] {
	const picked = new Set(pickedOptionIds);
	return days.map((day) => ({
		...day,
		tracks: day.tracks.toSorted((a, b) => a.sortOrder - b.sortOrder),
		entries: day.entries
			.filter(
				(entry) =>
					entry.surveyOptions.length === 0 ||
					entry.surveyOptions.some((option) => picked.has(option.id))
			)
			.toSorted((a, b) => a.startTime.getTime() - b.startTime.getTime())
	}));
}

/** The tracks of the schedule meant for someone in `seat`; none when their seat has no track. */
export function ownTrackIds({
	days,
	seat
}: {
	days: readonly { tracks: readonly SeatTrack[] }[];
	seat: Seat;
}): string[] {
	const isOwn = isOwnTrackOf(seat);
	return [...new Set(days.flatMap((day) => day.tracks.filter(isOwn).map((track) => track.id)))];
}
