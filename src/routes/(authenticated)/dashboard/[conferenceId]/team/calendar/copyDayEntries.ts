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
	tracks: { id: string }[];
}

/**
 * The target day's tracks for an entry: those with the same name as the entry's tracks on the
 * source day. A track the target day lacks is left out; an entry that ends up without any
 * is skipped by the copy.
 */
export function matchingTargetTrackIds(
	trackIds: readonly string[],
	sourceTracks: readonly NamedTrack[],
	targetTracks: readonly NamedTrack[]
): string[] {
	return trackIds.flatMap((trackId) => {
		const sourceTrack = sourceTracks.find((t) => t.id === trackId);
		const target = sourceTrack && targetTracks.find((t) => t.name === sourceTrack.name);
		return target ? [target.id] : [];
	});
}

/**
 * Where the tracks of a moved entry land on the target day: the matching ones, or, without a
 * match, the target day's first track.
 */
export function retargetTrackRange(
	range: { from: string | null; to: string | null },
	sourceTracks: readonly NamedTrack[],
	targetTracks: readonly NamedTrack[]
): { from: string | null; to: string | null } {
	const [from, to] = matchingTargetTrackIds(
		[range.from, range.to ?? range.from].filter((id) => id !== null),
		sourceTracks,
		targetTracks
	);
	const first = from ?? targetTracks[0]?.id ?? null;
	return { from: first, to: to ?? first };
}

/** The arguments that create a copy of `entry` on the target day, at the same wall-clock times. */
export function copiedEntryArgs<Color>(
	entry: CopySourceEntry<Color>,
	targetDay: { id: string; date: Date | string },
	tracks: { source: readonly NamedTrack[]; target: readonly NamedTrack[] }
) {
	return {
		calendarDayId: targetDay.id,
		calendarTrackIds: matchingTargetTrackIds(
			entry.tracks.map((track) => track.id),
			tracks.source,
			tracks.target
		),
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
