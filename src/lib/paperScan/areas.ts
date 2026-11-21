import { fieldOfCode, PAPER_FIELDS, type PaperField } from './fields';
import type { Point } from './markerGeometry';

/**
 * What a page's printed code says about the page (`areas` of a `print` code), so a scan is read
 * the way that page was printed: its size, where its four alignment marks are, and where its
 * fields are. Compact, since every byte makes the code denser: 12-bit numbers, two to three
 * bytes, in tenths of a millimetre (a page up to 40 cm), field codes as they are; first the page's
 * width and height, then the marks' centres (x, y each, corner by corner clockwise from the top
 * left), then per field its code, left, top, width and height.
 */

/** A field's box on its page, in millimetres from the top left. */
export type PaperArea = { field: PaperField; x: number; y: number; width: number; height: number };
/** A page's size, its marks' centres and its fields, in millimetres. */
export type PageAreas = {
	page: { width: number; height: number };
	markers: Point[];
	areas: PaperArea[];
};

const MAX = 0xfff;
const HEADER = 10;
const RECORD = 5;

const tenths = (millimetres: number) => Math.round(Math.min(Math.max(millimetres * 10, 0), MAX));

/** 12-bit numbers as bytes: two in three, an odd last one in two. */
function pack(values: number[]): Uint8Array {
	const bytes: number[] = [];
	for (let index = 0; index < values.length; index += 2) {
		const [a, b] = [values[index], values[index + 1]];
		bytes.push(a >> 4);
		if (b === undefined) bytes.push((a & 0xf) << 4);
		else bytes.push(((a & 0xf) << 4) | (b >> 8), b & 0xff);
	}
	return Uint8Array.from(bytes);
}

/** The 12-bit numbers `pack` made; `null` for a length it cannot have made. */
function unpack(bytes: Uint8Array): number[] | null {
	if (bytes.length % 3 === 1) return null;
	const values: number[] = [];
	for (let at = 0; at < bytes.length; at += 3) {
		values.push((bytes[at] << 4) | (bytes[at + 1] >> 4));
		if (at + 2 < bytes.length) values.push(((bytes[at + 1] & 0xf) << 8) | bytes[at + 2]);
	}
	return values;
}

/** The bytes a code carries for a page. */
export function encodeAreas({ page, markers, areas }: PageAreas): Uint8Array {
	return pack([
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
	]);
}

/** What a code's bytes say about its page; `null` for bytes that are none. Unknown fields are left out. */
export function decodeAreas(bytes: Uint8Array): PageAreas | null {
	const values = unpack(bytes);
	if (!values || values.length < HEADER || (values.length - HEADER) % RECORD !== 0) return null;
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
