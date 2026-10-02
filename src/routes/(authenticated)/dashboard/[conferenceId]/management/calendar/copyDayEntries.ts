import { moveToDay } from './calendarTime';

type Maybe<T> = T | null | undefined;

interface NamedTrack {
	id: string;
	name: string;
}

/** A calendar entry as the copy reads it from the source day. */
export interface CopySourceEntry<Color> {
	name: string;
	description?: Maybe<string>;
	startTime: Date | string;
	endTime: Date | string;
	fontAwesomeIcon?: Maybe<string>;
	color: Color;
	placeId?: Maybe<string>;
	room?: Maybe<string>;
	calendarTrackId?: Maybe<string>;
}

/**
 * The target day's track for an entry: the one with the same name as the entry's track on the
 * source day, or none.
 */
export function matchingTargetTrackId(
	calendarTrackId: Maybe<string>,
	sourceTracks: readonly NamedTrack[],
	targetTracks: readonly NamedTrack[]
): string | null {
	if (!calendarTrackId) return null;
	const sourceTrack = sourceTracks.find((t) => t.id === calendarTrackId);
	if (!sourceTrack) return null;
	return targetTracks.find((t) => t.name === sourceTrack.name)?.id ?? null;
}

/** The arguments that create a copy of `entry` on the target day, at the same wall-clock times. */
export function copiedEntryArgs<Color>(
	entry: CopySourceEntry<Color>,
	targetDay: { id: string; date: Date | string },
	tracks: { source: readonly NamedTrack[]; target: readonly NamedTrack[] }
) {
	return {
		calendarDayId: targetDay.id,
		calendarTrackId: matchingTargetTrackId(entry.calendarTrackId, tracks.source, tracks.target),
		name: entry.name,
		description: entry.description ?? null,
		startTime: moveToDay(entry.startTime, targetDay.date),
		endTime: moveToDay(entry.endTime, targetDay.date),
		fontAwesomeIcon: entry.fontAwesomeIcon ?? null,
		color: entry.color,
		placeId: entry.placeId ?? null,
		room: entry.room ?? null
	};
}
