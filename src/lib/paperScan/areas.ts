import { fieldOfCode, PAPER_FIELDS, type PaperField } from './fields';

/**
 * Where a page's fields are, as its printed code carries them (`areas` of a `print` code), so a
 * scan is read the way that page was printed. Compact, since every byte makes the code denser: the
 * page's size in tenths of a millimetre, then per field its code and its box as fractions of the
 * page, each an unsigned 16-bit number (big-endian).
 */

/** A field's box on its page, as fractions of the page from the top left. */
export type PaperArea = { field: PaperField; x: number; y: number; width: number; height: number };
/** A page's size in millimetres and the fields on it. */
export type PageAreas = { page: { width: number; height: number }; areas: PaperArea[] };

const HEADER = 4;
const RECORD = 9;
const FULL = 0xffff;

const toFraction = (value: number) => Math.round(Math.min(Math.max(value, 0), 1) * FULL);

/** The bytes a code carries for `areas` on a page of `page` (millimetres). */
export function encodeAreas({ page, areas }: PageAreas): Uint8Array {
	const bytes = new Uint8Array(HEADER + areas.length * RECORD);
	const view = new DataView(bytes.buffer);
	view.setUint16(0, Math.round(page.width * 10));
	view.setUint16(2, Math.round(page.height * 10));
	for (const [index, area] of areas.entries()) {
		const at = HEADER + index * RECORD;
		view.setUint8(at, PAPER_FIELDS[area.field].code);
		view.setUint16(at + 1, toFraction(area.x));
		view.setUint16(at + 3, toFraction(area.y));
		view.setUint16(at + 5, toFraction(area.width));
		view.setUint16(at + 7, toFraction(area.height));
	}
	return bytes;
}

/** The areas a code's bytes describe; `null` for bytes that are none. Unknown fields are left out. */
export function decodeAreas(bytes: Uint8Array): PageAreas | null {
	if (bytes.length < HEADER || (bytes.length - HEADER) % RECORD !== 0) return null;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const page = { width: view.getUint16(0) / 10, height: view.getUint16(2) / 10 };
	if (page.width === 0 || page.height === 0) return null;
	const areas: PaperArea[] = [];
	for (let at = HEADER; at < bytes.length; at += RECORD) {
		const field = fieldOfCode(view.getUint8(at));
		if (!field) continue;
		areas.push({
			field,
			x: view.getUint16(at + 1) / FULL,
			y: view.getUint16(at + 3) / FULL,
			width: view.getUint16(at + 5) / FULL,
			height: view.getUint16(at + 7) / FULL
		});
	}
	return { page, areas };
}
