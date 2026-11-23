import type { FieldReading, FieldState } from './readPaper';

/** Two readings of one field as one: a clear one beats an unclear one, two that disagree are unclear. */
function mergeStates({ a, b }: { a: FieldState; b: FieldState }): FieldState {
	if (a === 'unclear') return b;
	if (b === 'unclear' || a === b) return a;
	return 'unclear';
}

/** The fields of one page read in several pictures of it, as one reading. */
export function mergeFrames(frames: readonly (readonly FieldReading[])[]): FieldReading[] {
	const merged = new Map<FieldReading['field'], FieldState>();
	for (const { field, state } of frames.flat()) {
		const known = merged.get(field);
		merged.set(field, known === undefined ? state : mergeStates({ a: known, b: state }));
	}
	return [...merged].map(([field, state]) => ({ field, state }));
}

/** The pictures taken of a page so far: how many, and what was read off those that showed it. */
export interface TakenPage {
	pictures: number;
	frames: FieldReading[][];
}

/** About three seconds of pictures: then a page is done with whatever was read of it, if anything. */
const MAX_PICTURES = 10;

/**
 * One more picture of a page, and what was read off it (`null`: not readable in it): answers the
 * pictures so far, and whether the page is done, because they settle it or no more are waited for.
 */
export function addPicture({
	taken = { pictures: 0, frames: [] },
	read
}: {
	taken: TakenPage | undefined;
	read: FieldReading[] | null;
}): TakenPage & { done: boolean } {
	const pictures = taken.pictures + 1;
	const frames = read ? [...taken.frames, read] : taken.frames;
	return { pictures, frames, done: framesSettled(frames) || pictures >= MAX_PICTURES };
}

/** How many pictures of a page have to agree before it counts as read. */
const AGREEING_FRAMES = 2;

/**
 * Whether the pictures of a page taken so far tell all of it: two of them (or one, of a page
 * without fields), and no field left unclear between them.
 */
export function framesSettled(frames: readonly (readonly FieldReading[])[]) {
	const merged = mergeFrames(frames);
	if (frames.length > 0 && merged.length === 0) return true;
	return frames.length >= AGREEING_FRAMES && merged.every(({ state }) => state !== 'unclear');
}
