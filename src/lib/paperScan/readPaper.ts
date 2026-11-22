import { Matrix, solve } from 'ml-matrix';
import { PAPER_FIELDS, type PaperField, type PaperMark } from './fields';
import type { PageAreas, PaperArea } from './areas';
import { findMarkers, type Picture } from './markers';
import type { Point } from './markerGeometry';

/**
 * Reads the fields of a scanned page: the four markers give where the page lies in the picture
 * (a perspective through their centres, which the code says, which also takes in a page printed smaller, stretched by
 * the printer, scanned crooked or upside down), and each field the share of the paper inside it
 * that is darker than the paper around it. A box's frame and the line a field is written on (both
 * the template's) are kept out by reading inside the box and above the line.
 */

/** What a field holds: ticked or signed, empty, or too little to tell (a person decides). */
export type FieldState = 'yes' | 'no' | 'unclear';
export type FieldReading = { field: PaperField; state: FieldState };

/** Maps page millimetres into the picture through four point pairs (a homography). */
export function perspective({ from, to }: { from: Point[]; to: Point[] }) {
	const rows: number[][] = [];
	const values: number[] = [];
	for (const [index, { x, y }] of from.entries()) {
		const target = to[index];
		rows.push(
			[x, y, 1, 0, 0, 0, -target.x * x, -target.x * y],
			[0, 0, 0, x, y, 1, -target.y * x, -target.y * y]
		);
		values.push(target.x, target.y);
	}
	const h = solve(new Matrix(rows), Matrix.columnVector(values)).to1DArray();
	return ({ x, y }: Point): Point => {
		const w = h[6] * x + h[7] * y + 1;
		return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w };
	};
}

/** The brightness (0 to 255) of the pixel at `point`; outside the picture counts as paper. */
function brightness({ picture, point }: { picture: Picture; point: Point }) {
	const x = Math.round(point.x);
	const y = Math.round(point.y);
	if (x < 0 || y < 0 || x >= picture.width || y >= picture.height) return 255;
	const at = (y * picture.width + x) * 4;
	const { data } = picture;
	return 0.299 * data[at] + 0.587 * data[at + 1] + 0.114 * data[at + 2];
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

/**
 * How bright the paper is around `box`: lighting differs across a photo. Most of what lies 2 mm
 * around a field is paper even beside a label, so a high percentile of it is.
 */
function paperAround({ picture, toPicture, box }: ReadArgs & { box: Box }) {
	const values: number[] = [];
	const steps = 40;
	for (let step = 0; step <= steps; step++) {
		const along = step / steps;
		for (const point of [
			{ x: box.x - 2 + (box.width + 4) * along, y: box.y - 2 },
			{ x: box.x - 2 + (box.width + 4) * along, y: box.y + box.height + 2 },
			{ x: box.x - 2, y: box.y - 2 + (box.height + 4) * along },
			{ x: box.x + box.width + 2, y: box.y - 2 + (box.height + 4) * along }
		]) {
			values.push(brightness({ picture, point: toPicture(point) }));
		}
	}
	values.sort((a, b) => a - b);
	return values[Math.floor(values.length * 0.8)];
}

type ReadArgs = { picture: Picture; toPicture: (point: Point) => Point };

/** Ink darker than this share of the paper's brightness counts. */
const INK = 0.65;
/** Columns a line's width is cut into, to tell writing from a speck. */
const COLUMNS = 20;
/** The most samples taken across one side of a field. */
const MAX_SAMPLES = 240;

/**
 * The share of `box` covered in ink, and the share of its width the ink spans. Sampled about once
 * per pixel of the picture, so a small picture is not read finer than it is.
 */
export function inkIn({ picture, toPicture, box }: ReadArgs & { box: Box }) {
	const paper = paperAround({ picture, toPicture, box });
	const origin = toPicture({ x: box.x, y: box.y });
	const across = toPicture({ x: box.x + box.width, y: box.y });
	const down = toPicture({ x: box.x, y: box.y + box.height });
	const columns = Math.min(
		MAX_SAMPLES,
		Math.max(4, Math.ceil(Math.hypot(across.x - origin.x, across.y - origin.y)))
	);
	const rows = Math.min(
		MAX_SAMPLES,
		Math.max(4, Math.ceil(Math.hypot(down.x - origin.x, down.y - origin.y)))
	);
	let dark = 0;
	const inked = new Set<number>();
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const point = {
				x: box.x + ((column + 0.5) / columns) * box.width,
				y: box.y + ((row + 0.5) / rows) * box.height
			};
			if (brightness({ picture, point: toPicture(point) }) < paper * INK) {
				dark += 1;
				inked.add(Math.floor((column / columns) * COLUMNS));
			}
		}
	}
	return { ink: dark / (rows * columns), span: inked.size / COLUMNS };
}

/**
 * Ticked, empty or unclear from the ink found: a cross covers a good part of a box, a stray dot
 * almost none of it; writing on a line is thin but runs along it, a speck does not.
 */
export function judgeMark({
	mark,
	ink,
	span
}: {
	mark: PaperMark;
	ink: number;
	span: number;
}): FieldState {
	if (mark === 'checkbox') {
		if (ink >= 0.08) return 'yes';
		return ink < 0.025 ? 'no' : 'unclear';
	}
	if (ink >= 0.006 && span >= 0.2) return 'yes';
	return ink < 0.002 ? 'no' : 'unclear';
}

/**
 * The fields of `areas` read off `picture`; `null` when the four markers are not all in it (the
 * page is not wholly in the picture, or too small or blurred in it).
 */
export function readPaper({
	picture,
	areas
}: {
	picture: Picture;
	areas: PageAreas;
}): FieldReading[] | null {
	const found = findMarkers(picture);
	if (!found) return null;
	const toPicture = perspective({ from: areas.markers, to: found });
	return readAreas({ picture, toPicture, areas: areas.areas });
}

/**
 * The fields of `areas` read off `picture`, page millimetres mapped into it by `toPicture`: a scan
 * (`readPaper`), or the blank template itself, to tell whether its own print would already read
 * as filled in (the layout editor).
 */
export function readAreas({
	picture,
	toPicture,
	areas
}: ReadArgs & { areas: readonly PaperArea[] }): FieldReading[] {
	return areas.map(({ field, ...box }) => {
		const { mark } = PAPER_FIELDS[field];
		const inner = innerBox({ box, mark });
		return { field, state: judgeMark({ mark, ...inkIn({ picture, toPicture, box: inner }) }) };
	});
}
