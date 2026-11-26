import aruco from 'js-aruco2';
import type { Point } from './markerGeometry';
import { readingVariants, type Picture, type ReadingVariant } from './picture';

/**
 * The alignment marks printed on every main page of the application documents: ArUco markers,
 * made to be found in a crooked, blurry picture, and each with an id, so which corner is which
 * (and so how the page lies) comes with them. Their centres are what a scan is aligned on
 * (`./readPaper`).
 */

/** The ids printed at the top left, top right, bottom right and bottom left corner. */
const MARKER_IDS = [0, 1, 2, 3] as const;
const DICTIONARY = 'ARUCO_MIP_36h12';
/** A marker is its bits in a black border one cell wide. */
const BITS = 6;
export const MARKER_CELLS = BITS + 2;

let dictionary: ReturnType<typeof createDictionary> | undefined;
const createDictionary = () => new aruco.AR.Dictionary(DICTIONARY);

/**
 * The cells of the marker of `corner` (0 top left, clockwise), row by row, `true` where it is
 * black: its border and its dark bits.
 */
export function markerCells(corner: number): boolean[][] {
	dictionary ??= createDictionary();
	const bits = dictionary.codeList[MARKER_IDS[corner]];
	return Array.from({ length: MARKER_CELLS }, (_, row) =>
		Array.from({ length: MARKER_CELLS }, (_, column) => {
			const inBorder =
				row === 0 || column === 0 || row === MARKER_CELLS - 1 || column === MARKER_CELLS - 1;
			return inBorder || bits[(row - 1) * BITS + (column - 1)] === '0';
		})
	);
}

/**
 * How many of a marker's 36 bits may be read wrong. The dictionary's markers differ in at least 12,
 * so up to 5 still name one marker only; any more could be another one, or none.
 */
const MAX_WRONG_BITS = 5;

let detector: ReturnType<typeof createDetector> | undefined;
// the library takes what is below the distance it is given
const createDetector = () =>
	new aruco.AR.Detector({ dictionaryName: DICTIONARY, maxHammingDistance: MAX_WRONG_BITS + 1 });

/** A marker found: which corner of the page it is, and its own corners clockwise from the top left. */
export type FoundMarker = { corner: number; corners: Point[]; wrongBits: number };

/** How bright a grey picture is between its pixels; outside it, as at its edge. */
function greyAt({ picture, x, y }: { picture: Picture; x: number; y: number }) {
	const clampedX = Math.min(picture.width - 1.001, Math.max(0, x));
	const clampedY = Math.min(picture.height - 1.001, Math.max(0, y));
	const x0 = Math.floor(clampedX);
	const y0 = Math.floor(clampedY);
	const [fx, fy] = [clampedX - x0, clampedY - y0];
	const value = (px: number, py: number) => picture.data[(py * picture.width + px) * 4];
	return (
		(value(x0, y0) * (1 - fx) + value(x0 + 1, y0) * fx) * (1 - fy) +
		(value(x0, y0 + 1) * (1 - fx) + value(x0 + 1, y0 + 1) * fx) * fy
	);
}

/** A line through `middle` along `direction` (of length 1). */
type Line = { middle: Point; direction: Point };

/** The line closest to `points`. */
function lineThrough(points: readonly Point[]): Line {
	const middle = {
		x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
		y: points.reduce((sum, { y }) => sum + y, 0) / points.length
	};
	let [xx, xy, yy] = [0, 0, 0];
	for (const point of points) {
		const [dx, dy] = [point.x - middle.x, point.y - middle.y];
		xx += dx * dx;
		xy += dx * dy;
		yy += dy * dy;
	}
	const angle = Math.atan2(2 * xy, xx - yy) / 2;
	return { middle, direction: { x: Math.cos(angle), y: Math.sin(angle) } };
}

/** Where two lines cross; `undefined` for parallel ones. */
function crossing({ a, b }: { a: Line; b: Line }): Point | undefined {
	const turn = a.direction.x * b.direction.y - a.direction.y * b.direction.x;
	if (Math.abs(turn) < 1e-6) return undefined;
	const [dx, dy] = [b.middle.x - a.middle.x, b.middle.y - a.middle.y];
	const share = (dx * b.direction.y - dy * b.direction.x) / turn;
	return { x: a.middle.x + a.direction.x * share, y: a.middle.y + a.direction.y * share };
}

/**
 * The line of the edge from `from` to `to` of a marker, whose black lies to the right of the way
 * there: between paper and black where it is steepest, at several places along it.
 */
function edgeLine({ picture, from, to }: { picture: Picture; from: Point; to: Point }): Line {
	const length = Math.hypot(to.x - from.x, to.y - from.y);
	// out of the marker, at a right angle to the edge
	const out = { x: (to.y - from.y) / length, y: -(to.x - from.x) / length };
	// within the black border, one cell of eight
	const reach = Math.max(1.5, length / MARKER_CELLS);
	const points: Point[] = [];
	for (let along = 0.15; along <= 0.86; along += 0.07) {
		const on = { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along };
		let [weights, weighted] = [0, 0];
		for (let off = -reach; off <= reach; off += 0.25) {
			const step = (by: number) =>
				greyAt({ picture, x: on.x + out.x * (off + by), y: on.y + out.y * (off + by) });
			const rise = Math.max(0, step(0.5) - step(-0.5)) ** 2;
			weights += rise;
			weighted += rise * off;
		}
		if (weights === 0) continue;
		const off = weighted / weights;
		points.push({ x: on.x + out.x * off, y: on.y + out.y * off });
	}
	return points.length < 3 ? lineThrough([from, to]) : lineThrough(points);
}

/** A marker's corners to a fraction of a pixel: where the lines of its edges cross. */
function refineCorners({ picture, corners }: { picture: Picture; corners: Point[] }): Point[] {
	const edges = corners.map((from, index) =>
		edgeLine({ picture, from, to: corners[(index + 1) % 4] })
	);
	const size = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
	return corners.map((corner, index) => {
		const exact = crossing({ a: edges[(index + 3) % 4], b: edges[index] });
		const moved = exact && Math.hypot(exact.x - corner.x, exact.y - corner.y);
		return exact && moved !== undefined && moved < size / MARKER_CELLS ? exact : corner;
	});
}

/** The markers in one picture, as it is. */
function markersIn({ picture, scale }: ReadingVariant): FoundMarker[] {
	detector ??= createDetector();
	return detector.detect(picture).flatMap(({ id, corners, hammingDistance }) => {
		const corner = MARKER_IDS.findIndex((known) => known === id);
		if (corner < 0 || corners.length !== 4) return [];
		return [
			{
				corner,
				// a pixel of a smaller picture covers several: its middle is meant
				corners: refineCorners({ picture, corners }).map(({ x, y }) => ({
					x: (x + 0.5) * scale - 0.5,
					y: (y + 0.5) * scale - 0.5
				})),
				wrongBits: hammingDistance
			}
		];
	});
}

/**
 * The page's markers in `picture`, at most one a corner, looked for in one `readingVariants` after
 * the other until all four are found: a marker one variant shows and the next does not still counts.
 */
export function locateMarkers(picture: Picture): FoundMarker[] {
	const best = new Map<number, FoundMarker>();
	for (const variant of readingVariants(picture)) {
		for (const marker of markersIn(variant)) {
			const known = best.get(marker.corner);
			if (!known || marker.wrongBits < known.wrongBits) best.set(marker.corner, marker);
		}
		if (best.size === MARKER_IDS.length) break;
	}
	return [...best.values()].sort((a, b) => a.corner - b.corner);
}

/**
 * How many quarter turns (clockwise) a picture with these markers has to be turned by for its page to stand
 * upright; none where they do not agree, as those of two pages side by side.
 */
export function uprightTurn(found: readonly FoundMarker[]): number {
	const turns = new Set(
		found.map(({ corners: [topLeft, topRight] }) => {
			const angle = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
			return (4 - Math.round(angle / (Math.PI / 2))) % 4;
		})
	);
	const [turn, ...others] = turns;
	return others.length > 0 ? 0 : (turn ?? 0);
}

/** Where a marker's diagonals cross: its centre, also where it is seen at an angle. */
function centerOf([a, b, c, d]: readonly Point[]): Point {
	const across = { x: c.x - a.x, y: c.y - a.y };
	const down = { x: d.x - b.x, y: d.y - b.y };
	const turn = across.x * down.y - across.y * down.x;
	if (Math.abs(turn) < 1e-9) return { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
	const share = ((b.x - a.x) * down.y - (b.y - a.y) * down.x) / turn;
	return { x: a.x + across.x * share, y: a.y + across.y * share };
}

/** The centres of the four markers in `picture`, corner by corner; `null` unless all four are there. */
export function findMarkers(picture: Picture): Point[] | null {
	const found = locateMarkers(picture);
	return found.length === MARKER_IDS.length ? found.map(({ corners }) => centerOf(corners)) : null;
}
