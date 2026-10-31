import { moveToDay } from './calendarTime';

type Maybe<T> = T | null | undefined;

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
	surveyOptions?: Maybe<{ id: string }[]>;
	tracks: { id: string }[];
}

/**
 * The tracks of an entry that also run on the target day: a track is the conference's, so it
 * keeps its id from day to day. A track the target day lacks is left out; an entry that ends up
 * without any is skipped by the copy.
 */
export function matchingTargetTrackIds({
	trackIds,
	targetTracks
}: {
	trackIds: readonly string[];
	targetTracks: readonly { id: string }[];
}): string[] {
	const onTarget = new Set(targetTracks.map((track) => track.id));
	return trackIds.filter((trackId) => onTarget.has(trackId));
}

/**
 * Where the tracks of a moved entry land on the target day: the same ones where it has them, or
 * else the target day's first track.
 */
export function retargetTrackRange({
	range,
	targetTracks
}: {
	range: { from: string | null; to: string | null };
	targetTracks: readonly { id: string }[];
}): { from: string | null; to: string | null } {
	const [from, to] = matchingTargetTrackIds({
		trackIds: [range.from, range.to ?? range.from].filter((id) => id !== null),
		targetTracks
	});
	const first = from ?? targetTracks[0]?.id ?? null;
	return { from: first, to: to ?? first };
}

/** The arguments that create a copy of `entry` on the target day, at the same wall-clock times. */
export function copiedEntryArgs<Color>({
	entry,
	targetDay,
	tracks
}: {
	entry: CopySourceEntry<Color>;
	targetDay: { id: string; date: Date | string };
	/** The tracks running on the target day */
	tracks: readonly { id: string }[];
}) {
	return {
		calendarDayId: targetDay.id,
		calendarTrackIds: matchingTargetTrackIds({
			trackIds: entry.tracks.map((track) => track.id),
			targetTracks: tracks
		}),
		name: entry.name,
		description: entry.description ?? null,
		startTime: moveToDay({ time: entry.startTime, dayDate: targetDay.date }),
		endTime: moveToDay({ time: entry.endTime, dayDate: targetDay.date }),
		fontAwesomeIcon: entry.fontAwesomeIcon ?? null,
		color: entry.color,
		placeId: entry.placeId ?? null,
		room: entry.room ?? null,
		surveyOptionIds: entry.surveyOptions?.map((option) => option.id) ?? []
	};
}
