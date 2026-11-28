import type { Point } from '../markerGeometry';
import { aimMarkers, centerOf } from '../markers';
import { brightnessAt, type Picture } from '../picture';

/**
 * Aiming a camera at a page: a small picture of the preview, many times a second, tells where the
 * page's corner marks are, and so what the person holding it should do. Only once the page lies whole,
 * large and still in the picture is one photo taken and read (`pageReader`).
 */

/** A corner mark: which corner of the page (0 top left, clockwise), where, as shares of the picture. */
export type AimMark = { corner: number; at: Point };

/** What one small picture of the preview shows of a page. */
export interface Aim {
	width: number;
	height: number;
	marks: AimMark[];
	/** Too dark to tell much: the light should go on. */
	dark: boolean;
}

/** Darker than this on average, a picture is too dark to read a page in. */
const DARK = 70;

function isDark(picture: Picture) {
	const step = Math.max(1, Math.floor(Math.min(picture.width, picture.height) / 32));
	let [sum, count] = [0, 0];
	for (let y = 0; y < picture.height; y += step) {
		for (let x = 0; x < picture.width; x += step) {
			sum += brightnessAt({ picture, at: (y * picture.width + x) * 4 });
			count += 1;
		}
	}
	return count > 0 && sum / count < DARK;
}

/** What a small picture of the preview shows of a page. */
export function aimAt(picture: Picture): Aim {
	const { width, height } = picture;
	const marks = aimMarkers(picture).map(({ corner, corners }) => {
		const { x, y } = centerOf(corners);
		return { corner, at: { x: x / width, y: y / height } };
	});
	return { width, height, marks, dark: isDark(picture) };
}

/** A corner of the picture, as the person sees it. */
export type ViewCorner = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

/** What the person aiming should do; `ready` takes the photo. */
export type AimHint =
	| { kind: 'findPage' | 'dark' | 'nextPage' | 'closer' | 'farther' | 'holdStill' | 'ready' }
	| { kind: 'covered'; where?: ViewCorner };

/** How the aiming went so far. */
export interface AimTrack {
	last?: Aim;
	/** When `last` was taken, in milliseconds. */
	at?: number;
	/** Since when the page has lain still. */
	steadySince?: number;
	/**
	 * A photo of the page in view was taken: the next waits for another page, one that comes into
	 * view once this one left or was slid away (`takenAt`, where its marks lay).
	 */
	taken: boolean;
	takenAt?: Aim;
}

export const startAim = (): AimTrack => ({ taken: false });

/** How long a page with all four marks in view has to lie still before its photo is taken. */
const STEADY_MS = 350;
/** With one mark covered it is read all the same, after longer: it may yet come free. */
const STEADY_MS_COVERED = 1200;
/** A mark that moved less than this, as a share of the picture's longer side, lay still. */
const STILL = 0.012;
/**
 * A page taken whose marks moved this far since, as a share of the longer side, was slid away or
 * swapped for the next: a camera held over a stack sees pages slide through without leaving.
 */
const MOVED = 0.05;
/** Marks spanning less than this share of the picture's longer side: the page is too far. */
const LEAST_SPAN = 0.38;

/** Where `mark` is in the picture, in pixels. */
const pixelsOf = ({ aim, at }: { aim: Aim; at: Point }) => ({
	x: at.x * aim.width,
	y: at.y * aim.height
});

/** How far the marks of both pictures moved at most, as a share of the longer side. */
function movement({ last, aim }: { last: Aim; aim: Aim }) {
	const side = Math.max(aim.width, aim.height);
	let most = 0;
	for (const mark of aim.marks) {
		const before = last.marks.find(({ corner }) => corner === mark.corner);
		if (!before) return Infinity;
		const [a, b] = [pixelsOf({ aim: last, at: before.at }), pixelsOf({ aim, at: mark.at })];
		most = Math.max(most, Math.hypot(a.x - b.x, a.y - b.y) / side);
	}
	return most;
}

/**
 * How far the marks both pictures show moved at most, as a share of the longer side; a mark that
 * comes or goes, as the detection of one flickers, counts for nothing. Fewer than two in common: as
 * far as can be.
 */
function shift({ from, to }: { from: Aim; to: Aim }) {
	const side = Math.max(to.width, to.height);
	const moves = to.marks.flatMap((mark) => {
		const before = from.marks.find(({ corner }) => corner === mark.corner);
		if (!before) return [];
		const [a, b] = [pixelsOf({ aim: from, at: before.at }), pixelsOf({ aim: to, at: mark.at })];
		return [Math.hypot(a.x - b.x, a.y - b.y) / side];
	});
	return moves.length < 2 ? Infinity : Math.max(...moves);
}

/** How far apart the marks lie, as a share of the picture's longer side. */
function spanOf(aim: Aim) {
	const points = aim.marks.map(({ at }) => pixelsOf({ aim, at }));
	const xs = points.map(({ x }) => x);
	const ys = points.map(({ y }) => y);
	const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
	return span / Math.max(aim.width, aim.height);
}

/**
 * Where the one mark not seen should be, as a share of the picture: the page's corners make a
 * parallelogram, near enough. `undefined` unless exactly three are seen.
 */
export function missingMark(aim: Aim): AimMark | undefined {
	if (aim.marks.length !== 3) return undefined;
	const corner = [0, 1, 2, 3].find((known) => !aim.marks.some((mark) => mark.corner === known));
	if (corner === undefined) return undefined;
	const of = (wanted: number) => aim.marks.find((mark) => mark.corner === wanted)?.at;
	const [next, across, before] = [of((corner + 1) % 4), of((corner + 2) % 4), of((corner + 3) % 4)];
	if (!next || !across || !before) return undefined;
	return { corner, at: { x: next.x + before.x - across.x, y: next.y + before.y - across.y } };
}

/** Which corner of the picture `at` lies towards, from the middle of the marks. */
function viewCornerOf({ aim, at }: { aim: Aim; at: Point }): ViewCorner {
	const middle = {
		x: aim.marks.reduce((sum, mark) => sum + mark.at.x, at.x) / (aim.marks.length + 1),
		y: aim.marks.reduce((sum, mark) => sum + mark.at.y, at.y) / (aim.marks.length + 1)
	};
	const top = at.y < middle.y;
	if (at.x < middle.x) return top ? 'topLeft' : 'bottomLeft';
	return top ? 'topRight' : 'bottomRight';
}

const outside = ({ x, y }: Point) => x < -0.01 || y < -0.01 || x > 1.01 || y > 1.01;

/** What keeps a page with at least two marks in view from being taken, if anything. */
function problemOf(aim: Aim): AimHint | undefined {
	if (aim.marks.length === 2) return { kind: 'covered' };
	const missing = missingMark(aim);
	if (missing && outside(missing.at)) return { kind: 'farther' };
	if (spanOf(aim) < LEAST_SPAN) return { kind: 'closer' };
	return missing && { kind: 'covered', where: viewCornerOf({ aim, at: missing.at }) };
}

/** Whether a problem keeps the page from being taken at all; one covered corner only delays it. */
const blocks = (problem: AimHint | undefined) =>
	problem !== undefined && (problem.kind !== 'covered' || problem.where === undefined);

/** Since when the page has lain still, the previous picture included; `undefined` while it moves. */
function steadySinceOf({ track, aim }: { track: AimTrack; aim: Aim }) {
	if (!track.last || movement({ last: track.last, aim }) >= STILL) return undefined;
	return track.steadySince ?? track.at;
}

/** Whether a page that has lain still since `steadySince` is to be taken at `at`. */
function readyAt({ aim, at, steadySince }: { aim: Aim; at: number; steadySince?: number }) {
	const needed = aim.marks.length === 4 ? STEADY_MS : STEADY_MS_COVERED;
	return steadySince !== undefined && at - steadySince >= needed;
}

/** Whether the page taken was slid away, or the next one over it. */
const slidAwayFrom = ({ track, aim }: { track: AimTrack; aim: Aim }) =>
	track.takenAt !== undefined && shift({ from: track.takenAt, to: aim }) > MOVED;

/**
 * The aiming after one more picture of the preview, taken at `at` (milliseconds): what to tell the
 * person, and whether to take the photo now (`ready`).
 */
export function trackAim({ track, aim, at }: { track: AimTrack; aim: Aim; at: number }): {
	track: AimTrack;
	hint: AimHint;
} {
	const idle: AimHint = { kind: aim.dark ? 'dark' : 'findPage' };
	// the page left the picture: the next one may be taken
	if (aim.marks.length < 2) return { track: { last: aim, at, taken: false }, hint: idle };
	const slidAway = slidAwayFrom({ track, aim });
	if (track.taken && !slidAway) {
		return { track: { ...track, last: aim, at }, hint: { kind: 'nextPage' } };
	}
	const problem = problemOf(aim);
	const moving = blocks(problem) || slidAway;
	const steadySince = moving ? undefined : steadySinceOf({ track, aim });
	const next = { last: aim, at, steadySince, taken: false };
	if (readyAt({ aim, at, steadySince })) return { track: next, hint: { kind: 'ready' } };
	return { track: next, hint: problem ?? { kind: aim.dark ? 'dark' : 'holdStill' } };
}

/** The aiming once the photo of the page in view was taken in: the next waits for another page. */
export const pageTaken = (track: AimTrack): AimTrack => ({
	...track,
	taken: true,
	takenAt: track.last
});

/** The aiming once a photo said too little: another is taken after the page lies still again. */
export const tryAgain = (track: AimTrack): AimTrack => ({ ...track, steadySince: undefined });
