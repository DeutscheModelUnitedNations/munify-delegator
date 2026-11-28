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

/**
 * How many photos of a page are taken at most: each is a still the camera took when the page lay
 * whole and still in view (`camera/aim`), so a third rarely tells what two did not.
 */
const MAX_PICTURES = 3;

/**
 * One more photo of a page, and what was read off it (`null`: not readable in it): answers the
 * photos so far, and whether the page is done, because they settle it or no more are taken. A page
 * done with fields still unclear leaves those to a person.
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

/**
 * Whether the photos of a page taken so far tell all of it: one that leaves no field unclear is
 * enough, as a reading that cannot tell says "unclear" rather than guess (`readPaper`). Photos that
 * disagree leave the field unclear.
 */
export function framesSettled(frames: readonly (readonly FieldReading[])[]) {
	if (frames.length === 0) return false;
	return mergeFrames(frames).every(({ state }) => state !== 'unclear');
}
