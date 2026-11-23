import { fieldOfCode, PAPER_FIELDS, type PaperField } from './fields';
import type { Point } from './markerGeometry';

/**
 * What a page's printed code says about the page (`areas` of a `print` code), so a scan is read
 * the way that page was printed: its size, where its four alignment marks are, and where its
 * fields are. A plain list of whole numbers, which the code's CBOR holds as it is: lengths in
 * tenths of a millimetre, field codes as they are. First the page's width and height, then the
 * marks' centres (x, y each, corner by corner clockwise from the top left), then per field its
 * code, left, top, width and height. A field the page prints something in has a second record: its
 * code and `PRINTED`, the ink and the ink of its middle in thousandths, and two zeros. To a version
 * that knows none of it that is a field it does not know, which it leaves out.
 */

/**
 * A field's box on its page, in millimetres from the top left, and what the page itself prints in it
 * (`printedInkOf`, shares of the box).
 */
export type PaperArea = {
	field: PaperField;
	x: number;
	y: number;
	width: number;
	height: number;
	printed?: { ink: number; core: number };
};
/** A part of a field from one height to another, in millimetres from its top. */
export type ClearSpan = { top: number; bottom: number };

/** What a page prints in one of its fields itself, as measured (`printedInkOf`). */
export type PrintedInk = {
	field: PaperField;
	ink: number;
	core: number;
	/** The part of a line's field between the template's own lines. */
	clear?: ClearSpan | null;
};

/** Print nobody could measure: whatever is in such a field, a person looks at it. */
export const UNKNOWN_PRINT = { ink: 1, core: 1 };
/** Less than this (shares) is none, as a code carries it. */
const LEAST_PRINT = 0.001;

/**
 * The fields of a page as `printedInk` says it is printed: a line's field only where it is clear, and
 * each with the print in it. Without it (`undefined`: not measured) each has `UNKNOWN_PRINT`.
 */
export function areasAsPrinted({
	areas,
	printedInk
}: {
	areas: readonly PaperArea[];
	printedInk: readonly PrintedInk[] | undefined;
}): PaperArea[] {
	return areas.map((area) => {
		if (!printedInk) return { ...area, printed: UNKNOWN_PRINT };
		const found = printedInk.find(({ field }) => field === area.field);
		if (!found) return area;
		const { ink, core, clear } = found;
		const isClear =
			clear &&
			PAPER_FIELDS[area.field].mark === 'line' &&
			clear.top >= 0 &&
			clear.top < clear.bottom &&
			clear.bottom <= area.height;
		return {
			...area,
			...(isClear ? { y: area.y + clear.top, height: clear.bottom - clear.top } : {}),
			...(ink >= LEAST_PRINT || core >= LEAST_PRINT ? { printed: { ink, core } } : {})
		};
	});
}

/** A page's size, its marks' centres and its fields, in millimetres. */
export type PageAreas = {
	page: { width: number; height: number };
	markers: Point[];
	areas: PaperArea[];
};

const HEADER = 10;
const RECORD = 5;

/** Added to a field's code in its record of print. */
const PRINTED = 100;

const thousandths = (share: number) => Math.min(1000, Math.max(0, Math.round(share * 1000)));

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
		]),
		...areas.flatMap(({ field, printed }) =>
			printed
				? [
						PAPER_FIELDS[field].code + PRINTED,
						thousandths(printed.ink),
						thousandths(printed.core),
						0,
						0
					]
				: []
		)
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
		if (field) {
			areas.push({ field, x: mm[at + 1], y: mm[at + 2], width: mm[at + 3], height: mm[at + 4] });
			continue;
		}
		const printedIn = areas.find((area) => area.field === fieldOfCode(values[at] - PRINTED));
		if (printedIn) printedIn.printed = { ink: values[at + 1] / 1000, core: values[at + 2] / 1000 };
	}
	return { page, markers, areas };
}
