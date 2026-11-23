import { Matrix, solve } from 'ml-matrix';
import { PAPER_FIELDS, type PaperField, type PaperMark } from './fields';
import type { PageAreas, PaperArea } from './areas';
import { locateMarkers, markerCells, MARKER_CELLS, type FoundMarker } from './markers';
import { MARKER, type Point } from './markerGeometry';
import { brightnessAt, type Picture } from './picture';

/**
 * Reads the fields of a scanned page: the markers give where the page lies in the picture (a
 * perspective through their corners, which the code says where they are; it also takes in a page
 * printed smaller, stretched by the printer, scanned crooked or upside down; three of the four are
 * enough, so a thumb on a corner does not stop it), and each field the share of the paper inside it
 * that is darker than the paper around it. A box's frame and the line a field is written on (both
 * the template's) are kept out by reading inside the box and above the line. A picture too blurred,
 * noisy or small to tell nothing from something thin never says a field is empty.
 */

/** What a field holds: ticked or signed, empty, or too little to tell (a person decides). */
export type FieldState = 'yes' | 'no' | 'unclear';
export type FieldReading = { field: PaperField; state: FieldState };

/**
 * Maps page millimetres into the picture (a homography) through four point pairs or more; with more
 * than four, the one closest to all of them.
 */
export function perspective({ from, to }: { from: Point[]; to: Point[] }) {
	// around their middle and at one scale, so far apart coordinates do not swamp the equations
	const source = centered(from);
	const target = centered(to);
	const rows: number[][] = [];
	const values: number[] = [];
	for (const [index, { x, y }] of source.points.entries()) {
		const at = target.points[index];
		rows.push([x, y, 1, 0, 0, 0, -at.x * x, -at.x * y], [0, 0, 0, x, y, 1, -at.y * x, -at.y * y]);
		values.push(at.x, at.y);
	}
	const h = solve(new Matrix(rows), Matrix.columnVector(values)).to1DArray();
	return (point: Point): Point => {
		const { x, y } = source.into(point);
		const w = h[6] * x + h[7] * y + 1;
		return target.back({
			x: (h[0] * x + h[1] * y + h[2]) / w,
			y: (h[3] * x + h[4] * y + h[5]) / w
		});
	};
}

/** Points moved around their middle and scaled to about one, with the way there and back. */
function centered(points: readonly Point[]) {
	const middle = {
		x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
		y: points.reduce((sum, { y }) => sum + y, 0) / points.length
	};
	const reach =
		points.reduce((sum, { x, y }) => sum + Math.hypot(x - middle.x, y - middle.y), 0) /
			points.length || 1;
	const into = ({ x, y }: Point) => ({ x: (x - middle.x) / reach, y: (y - middle.y) / reach });
	const back = ({ x, y }: Point) => ({ x: x * reach + middle.x, y: y * reach + middle.y });
	return { points: points.map(into), into, back };
}

/** The mean brightness (0 to 255) of the pixels within `reach` of `point`; outside counts as paper. */
function brightness({
	picture,
	point,
	reach = 0
}: {
	picture: Picture;
	point: Point;
	reach?: number;
}) {
	const px = Math.round(point.x);
	const py = Math.round(point.y);
	let sum = 0;
	for (let y = py - reach; y <= py + reach; y++) {
		for (let x = px - reach; x <= px + reach; x++) {
			const inside = x >= 0 && y >= 0 && x < picture.width && y < picture.height;
			sum += inside ? brightnessAt({ picture, at: (y * picture.width + x) * 4 }) : 255;
		}
	}
	return sum / (2 * reach + 1) ** 2;
}

/** A box on the page in millimetres. */
type Box = { x: number; y: number; width: number; height: number };

/**
 * Where a field is read: inside a box's frame, with room for a scan aligned a little off; above the
 * template's line a field is written on (a signature, place and date), which handwriting crosses.
 */
function innerBox({ box, mark }: { box: Box; mark: PaperMark }): Box {
	if (mark === 'checkbox') {
		// past the form's frame and a scan aligned up to 0.3 mm off
		const inset = Math.max(0.6, Math.min(box.width, box.height) * 0.2);
		return {
			x: box.x + inset,
			y: box.y + inset,
			width: box.width - 2 * inset,
			height: box.height - 2 * inset
		};
	}
	return { x: box.x + 1, y: box.y + 0.5, width: box.width - 2, height: box.height - 2.5 };
}

type ReadArgs = { picture: Picture; toPicture: (point: Point) => Point };

/** How many pixels of the picture a millimetre of the page takes around `point`. */
function pixelsPerMm({ toPicture, point }: Pick<ReadArgs, 'toPicture'> & { point: Point }) {
	const at = toPicture(point);
	const across = toPicture({ x: point.x + 1, y: point.y });
	return Math.hypot(across.x - at.x, across.y - at.y);
}

/** How many pixels around a point are averaged: about a third of a pen stroke each way. */
const reachFor = (perMm: number) => Math.min(2, Math.round(perMm * 0.12));

/** How far beside a field its paper is looked at, in millimetres. */
const BESIDE = 2;
/** A field is this long, in millimetres, before the light along it is looked at in pieces. */
const PIECE = 12;

/** The brightness most of `values` reach: what is brighter than print, and no outlier. */
function paperOf(values: number[]) {
	values.sort((a, b) => a - b);
	return values[Math.floor(values.length * 0.8)];
}

/**
 * How bright the paper is anywhere in `box`: light differs across a photo, so it is taken above and
 * below each piece of the box and blended between them. Most of what lies beside a field is paper
 * even beside a label, so a high percentile of it is; a side wholly under print (a frame, a banner)
 * takes the other's.
 */
function paperAround({ picture, toPicture, box, reach }: ReadArgs & { box: Box; reach: number }) {
	const value = (point: Point) => brightness({ picture, point: toPicture(point), reach });
	const pieces = Math.max(1, Math.round(box.width / PIECE));
	const length = (box.width + 2 * BESIDE) / pieces;
	const steps = Math.max(12, Math.ceil(40 / pieces));
	const beside = (piece: number, y: number) =>
		Array.from({ length: steps }, (_, step) =>
			value({ x: box.x - BESIDE + (piece + (step + 0.5) / steps) * length, y })
		);
	// a box to tick is short: what lies left and right of it counts as well
	const ends =
		pieces > 1
			? []
			: Array.from({ length: steps }, (_, step) => {
					const y = box.y - BESIDE + ((step + 0.5) / steps) * (box.height + 2 * BESIDE);
					return [value({ x: box.x - BESIDE, y }), value({ x: box.x + box.width + BESIDE, y })];
				}).flat();
	const lights = Array.from({ length: pieces }, (_, piece) => {
		const top = paperOf([...beside(piece, box.y - BESIDE), ...ends]);
		const bottom = paperOf([...beside(piece, box.y + box.height + BESIDE), ...ends]);
		const brightest = Math.max(top, bottom);
		const paper = (side: number) => (side < brightest * 0.75 ? brightest : side);
		return { top: paper(top), bottom: paper(bottom) };
	});
	return ({ across, down }: { across: number; down: number }) => {
		const at = Math.min(pieces - 1, Math.max(0, across * pieces - 0.5));
		const first = lights[Math.floor(at)];
		const second = lights[Math.min(pieces - 1, Math.floor(at) + 1)];
		const share = at - Math.floor(at);
		const top = first.top * (1 - share) + second.top * share;
		const bottom = first.bottom * (1 - share) + second.bottom * share;
		return top * (1 - down) + bottom * down;
	};
}

/** Paper this much darker than the paper around it, as a share of it, is ink at the least. */
const FAINTEST_INK = 0.18;
/** How far above the noise of the paper ink has to stand out. */
const ABOVE_NOISE = 4;
/** How much darker than the paper around it a field's own paper may be. */
const MOST_OFF = 0.1;
/** Columns a line's width is cut into, to tell writing from a speck. */
const COLUMNS = 20;
/** The most samples taken across one side of a field. */
const MAX_SAMPLES = 240;

const samplesAcross = (pixels: number) => Math.min(MAX_SAMPLES, Math.max(4, Math.ceil(pixels)));

/** The middle of `box`, half as wide and high. */
const middleOf = ({ x, y, width, height }: Box): Box => ({
	x: x + width / 4,
	y: y + height / 4,
	width: width / 2,
	height: height / 2
});

/** The value `share` (0 to 1) of `values` are at most. */
function percentile({ values, share }: { values: ArrayLike<number>; share: number }) {
	const sorted = Float32Array.from(values).sort();
	return sorted[Math.floor((sorted.length - 1) * share)];
}

/**
 * The share of `box` covered in ink, and the share of its width the ink spans. Sampled about once
 * per pixel of the picture, so a small picture is not read finer than it is. `noise` is how noisy
 * the picture's paper is (`paperNoise`): ink has to stand out from it. `faintest` is the least dark
 * that counts, `around` the box whose surroundings are its paper (itself by default).
 */
export function inkIn({
	picture,
	toPicture,
	box,
	noise = 0,
	faintest = FAINTEST_INK,
	around = box
}: ReadArgs & { box: Box; noise?: number; faintest?: number; around?: Box }) {
	const reach = reachFor(pixelsPerMm({ toPicture, point: box }));
	const paper = paperAround({ picture, toPicture, box: around, reach });
	const origin = toPicture({ x: box.x, y: box.y });
	const across = toPicture({ x: box.x + box.width, y: box.y });
	const down = toPicture({ x: box.x, y: box.y + box.height });
	const columns = samplesAcross(Math.hypot(across.x - origin.x, across.y - origin.y));
	const rows = samplesAcross(Math.hypot(down.x - origin.x, down.y - origin.y));
	const darkness = new Float32Array(columns * rows);
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const share = { across: (column + 0.5) / columns, down: (row + 0.5) / rows };
			const point = toPicture({
				x: box.x + share.across * box.width,
				y: box.y + share.down * box.height
			});
			darkness[row * columns + column] =
				1 - brightness({ picture, point, reach }) / Math.max(1, paper(share));
		}
	}
	// the field's own paper may lie a little darker than what was found around it; its middle alone
	// may be all ink
	const own = around === box ? percentile({ values: darkness, share: 0.4 }) : 0;
	const threshold =
		Math.min(MOST_OFF, Math.max(-MOST_OFF, own)) + Math.max(faintest, noise * ABOVE_NOISE);
	let dark = 0;
	const inked = new Set<number>();
	for (const [index, value] of darkness.entries()) {
		if (value < threshold) continue;
		dark += 1;
		inked.add(Math.floor(((index % columns) / columns) * COLUMNS));
	}
	return { ink: dark / (rows * columns), span: inked.size / COLUMNS };
}

/** How many places across and down a page its noise is told from. */
const NOISE_PLACES = 64;

/**
 * How noisy the paper is, as a share of its brightness: how far places close together differ, most
 * of a page being empty. `within` is where on the page to look.
 */
function paperNoise({ picture, toPicture, within }: ReadArgs & { within: Box }) {
	const reach = reachFor(pixelsPerMm({ toPicture, point: within }));
	const apart = 2 * reach + 2;
	const differences: number[] = [];
	for (let row = 0; row < NOISE_PLACES; row++) {
		for (let column = 0; column < NOISE_PLACES; column++) {
			const point = toPicture({
				x: within.x + ((column + 0.5) / NOISE_PLACES) * within.width,
				y: within.y + ((row + 0.5) / NOISE_PLACES) * within.height
			});
			const here = brightness({ picture, point, reach });
			const there = brightness({ picture, point: { x: point.x + apart, y: point.y }, reach });
			differences.push(Math.abs(here - there) / Math.max(1, here, there));
		}
	}
	// the median difference of two noisy values is about 0.95 of the noise's deviation
	return percentile({ values: differences, share: 0.5 }) / 0.95;
}

/** The share of a field in ink from which on it is filled in, and below which it is empty. */
export const INK_OF = {
	checkbox: { yes: 0.08, no: 0.025 },
	line: { yes: 0.006, no: 0.002 }
} as const;
/** How much of a line's width writing runs along at the least. */
const LEAST_SPAN = 0.2;
/** Print comes out of a printer and a scanner thicker than it was measured on the page: how much. */
const OF_PRINT = 1.5;
/** How much more of a box its printed frame may take in a scan than on the page, as a share of it. */
const FRAME_VARIES = 0.15;
/** More print than this in a box's middle (a share of it) is no frame, whatever a scan shows. */
export const MOST_IN_MIDDLE = 0.25;
const NOTHING = { ink: 0, core: 0 };

/**
 * Ticked, empty or unclear from the ink found: a cross covers a good part of a box, a stray dot
 * almost none of it; writing on a line is thin but runs along it, a speck does not. A box's `core` is
 * the ink around its middle, which a cross goes through: ink along an edge only may be the frame
 * of a page aligned a little off, so a person decides. `printed` is what the page prints there itself:
 * only clearly more than it is a mark (in a box's middle, which its frame stays out of, or on a line),
 * and a box with its frame inside is empty while its middle is. It never makes a mark of what is none
 * without it.
 */
export function judgeMark({
	mark,
	ink,
	span,
	core = ink,
	printed = NOTHING
}: {
	mark: PaperMark;
	ink: number;
	span: number;
	core?: number;
	printed?: { ink: number; core: number };
}): FieldState {
	const { yes, no } = INK_OF[mark];
	if (ink < no) return 'no';
	if (mark === 'line') {
		return ink >= yes + printed.ink * OF_PRINT && span >= LEAST_SPAN ? 'yes' : 'unclear';
	}
	if (ink >= yes && core >= yes + printed.core * OF_PRINT) return 'yes';
	const framed = printed.ink > 0 && printed.core < MOST_IN_MIDDLE;
	return framed && core < no && ink < printed.ink + FRAME_VARIES ? 'no' : 'unclear';
}

/** Fewer pixels to the millimetre than this and a pen stroke is thinner than one. */
const MIN_PIXELS_PER_MM = 3;
/** Paper noisier than this (a share of its brightness) hides a thin stroke. */
const MAX_NOISE = 0.06;
/** A marker's black and white cells have to keep this share of the contrast of its border. */
const MIN_SHARPNESS = 0.5;

/**
 * How sharp the picture is where the markers are, 0 to 1: how far their black and white bits, a
 * millimetre each, stand apart, against the black of their border and the white around it.
 */
function sharpnessOf({
	picture,
	toPicture,
	markers,
	found
}: ReadArgs & { markers: readonly Point[]; found: readonly FoundMarker[] }) {
	const cell = MARKER.side / MARKER_CELLS;
	const contrasts = found.map(({ corner }) => {
		const center = markers[corner];
		const at = (row: number, column: number) =>
			brightness({
				picture,
				point: toPicture({
					x: center.x - MARKER.side / 2 + (column + 0.5) * cell,
					y: center.y - MARKER.side / 2 + (row + 0.5) * cell
				})
			});
		const sums = { black: 0, blacks: 0, white: 0, whites: 0 };
		markerCells(corner).forEach((cells, row) =>
			cells.forEach((black, column) => {
				if (black) {
					sums.black += at(row, column);
					sums.blacks += 1;
				} else {
					sums.white += at(row, column);
					sums.whites += 1;
				}
			})
		);
		const paper = at(-1, MARKER_CELLS / 2);
		return (sums.white / sums.whites - sums.black / sums.blacks) / Math.max(1, paper);
	});
	return contrasts.reduce((sum, value) => sum + value, 0) / contrasts.length;
}

/** How far off (millimetres) the markers' corners may lie from where the page says they are. */
const MAX_OFF_MM = 2;
/** Fewer markers than this do not tell how the page lies. */
const MIN_MARKERS = 3;

/** Which side of the line from `a` to `b` a point is on: its distance, times the line's length. */
const sideOf = ({ a, b, point }: { a: Point; b: Point; point: Point }) =>
	(b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);

/**
 * Whether `point` of the page lies between the markers it was aligned on. Outside of them (beyond
 * the line of two, where the third corner was covered) the perspective is only continued, and drifts
 * by up to a millimetre: too far for a box a few millimetres wide.
 */
function isBetween({ corners, point }: { corners: readonly Point[]; point: Point }) {
	if (corners.length > MIN_MARKERS) return true;
	const sides = corners.map((a, index) =>
		sideOf({ a, b: corners[(index + 1) % corners.length], point })
	);
	return sides.every((side) => side >= 0) || sides.every((side) => side <= 0);
}

/** The corners of the marker centred at `center` on the page, clockwise from the top left. */
const markerCorners = ({ x, y }: Point): Point[] => {
	const half = MARKER.side / 2;
	return [
		{ x: x - half, y: y - half },
		{ x: x + half, y: y - half },
		{ x: x + half, y: y + half },
		{ x: x - half, y: y + half }
	];
};

/** The page's perspective through `found`, and how far off (millimetres) its worst corner is. */
function alignOn({ markers, found }: { markers: readonly Point[]; found: readonly FoundMarker[] }) {
	const onPage = found.flatMap(({ corner }) => markerCorners(markers[corner]));
	const inPicture = found.flatMap(({ corners }) => corners);
	const toPicture = perspective({ from: onPage, to: inPicture });
	const perMm = pixelsPerMm({ toPicture, point: markers[found[0].corner] });
	const off = Math.max(
		...onPage.map((point, index) => {
			const at = toPicture(point);
			return Math.hypot(at.x - inPicture[index].x, at.y - inPicture[index].y) / perMm;
		})
	);
	return { toPicture, perMm, off, found };
}

/**
 * How the page lies in the picture: through all its markers found, or, where one of four does not
 * fit the others (a fold, something else taken for a marker), through the three that fit best;
 * `null` when they do not tell.
 */
function alignPage({ picture, markers }: { picture: Picture; markers: readonly Point[] }) {
	const found = locateMarkers(picture);
	if (found.length < MIN_MARKERS) return null;
	const all = alignOn({ markers, found });
	if (all.off <= MAX_OFF_MM) return all;
	if (found.length === MIN_MARKERS) return null;
	const [best] = found
		.map((left) => alignOn({ markers, found: found.filter((marker) => marker !== left) }))
		.sort((a, b) => a.off - b.off);
	return best.off <= MAX_OFF_MM ? best : null;
}

/**
 * The fields of `areas` read off `picture`; `null` when fewer than three of the four markers are in
 * it (the page is not wholly in the picture, or too small or blurred in it).
 */
export function readPaper({
	picture,
	areas
}: {
	picture: Picture;
	areas: PageAreas;
}): FieldReading[] | null {
	const aligned = alignPage({ picture, markers: areas.markers });
	if (!aligned) return null;
	const { toPicture, perMm, found } = aligned;
	const [topLeft, , bottomRight] = areas.markers;
	const noise = paperNoise({
		picture,
		toPicture,
		within: {
			...topLeft,
			width: bottomRight.x - topLeft.x,
			height: bottomRight.y - topLeft.y
		}
	});
	const sharpness = sharpnessOf({ picture, toPicture, markers: areas.markers, found });
	const faint = perMm < MIN_PIXELS_PER_MM || noise > MAX_NOISE || sharpness < MIN_SHARPNESS;
	const corners = found.map(({ corner }) => areas.markers[corner]);
	return readAreas({ picture, toPicture, areas: areas.areas, noise, faint }).map(
		(reading, index) => {
			const { x, y, width, height } = areas.areas[index];
			const between = isBetween({ corners, point: { x: x + width / 2, y: y + height / 2 } });
			const isBox = PAPER_FIELDS[reading.field].mark === 'checkbox';
			return isBox && !between ? { ...reading, state: 'unclear' } : reading;
		}
	);
}

/** The ink in a field: its share, how far it spans, and for a box the share of its middle. */
export function fieldInk({
	picture,
	toPicture,
	area: { field, ...box },
	noise
}: ReadArgs & { area: PaperArea; noise?: number }) {
	const { mark } = PAPER_FIELDS[field];
	const inner = innerBox({ box, mark });
	const { ink, span } = inkIn({ picture, toPicture, box: inner, noise });
	const core =
		mark === 'checkbox'
			? inkIn({ picture, toPicture, box: middleOf(inner), noise, around: inner }).ink
			: undefined;
	return { ink, span, core };
}

/**
 * The fields of `areas` read off `picture`, page millimetres mapped into it by `toPicture`: a scan
 * (`readPaper`), or the blank template itself, to tell whether its own print would already read
 * as filled in (the layout editor). `noise` is how noisy the picture's paper is; `faint`: it is too
 * poor to show a thin stroke.
 */
export function readAreas({
	picture,
	toPicture,
	areas,
	noise = 0,
	faint = false
}: ReadArgs & { areas: readonly PaperArea[]; noise?: number; faint?: boolean }): FieldReading[] {
	return areas.map((area) => {
		const { field, printed } = area;
		const { mark } = PAPER_FIELDS[field];
		const state = judgeMark({ mark, printed, ...fieldInk({ picture, toPicture, area, noise }) });
		return { field, state: state === 'no' && faint ? 'unclear' : state };
	});
}
