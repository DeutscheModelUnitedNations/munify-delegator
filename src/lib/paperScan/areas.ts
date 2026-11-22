import { fieldOfCode, PAPER_FIELDS, type PaperField } from './fields';
import type { Point } from './markerGeometry';

/**
 * What a page's printed code says about the page (`areas` of a `print` code), so a scan is read
 * the way that page was printed: its size, where its four alignment marks are, and where its
 * fields are. A plain list of whole numbers, which the code's CBOR holds as it is: lengths in
 * tenths of a millimetre, field codes as they are. First the page's width and height, then the
 * marks' centres (x, y each, corner by corner clockwise from the top left), then per field its
 * code, left, top, width and height.
 */

/** A field's box on its page, in millimetres from the top left. */
export type PaperArea = { field: PaperField; x: number; y: number; width: number; height: number };
/** A page's size, its marks' centres and its fields, in millimetres. */
export type PageAreas = {
	page: { width: number; height: number };
	markers: Point[];
	areas: PaperArea[];
};

const HEADER = 10;
const RECORD = 5;

const tenths = (millimetres: number) => Math.max(0, Math.round(millimetres * 10));

/** The numbers a code carries for a page. */
export function encodeAreas({ page, markers, areas }: PageAreas): number[] {
	return [
		tenths(page.width),
		tenths(page.height),
		...markers.flatMap(({ x, y }) => [tenths(x), tenths(y)]),
		...areas.flatMap(({ field, x, y, width, height }) => [
			PAPER_FIELDS[field].code,
			tenths(x),
			tenths(y),
			tenths(width),
			tenths(height)
		])
	];
}

/**
 * What a code's numbers say about its page; `null` for numbers that are none (too few, or not a
 * whole number of fields). Unknown fields are left out.
 */
export function decodeAreas(values: readonly number[]): PageAreas | null {
	if (values.length < HEADER || (values.length - HEADER) % RECORD !== 0) return null;
	const mm = values.map((value) => value / 10);
	const page = { width: mm[0], height: mm[1] };
	if (page.width === 0 || page.height === 0) return null;
	const markers = [0, 1, 2, 3].map((corner) => ({ x: mm[2 + corner * 2], y: mm[3 + corner * 2] }));
	const areas: PaperArea[] = [];
	for (let at = HEADER; at < values.length; at += RECORD) {
		const field = fieldOfCode(values[at]);
		if (!field) continue;
		areas.push({ field, x: mm[at + 1], y: mm[at + 2], width: mm[at + 3], height: mm[at + 4] });
	}
	return { page, markers, areas };
}
