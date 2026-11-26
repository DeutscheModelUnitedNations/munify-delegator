/**
 * A picture file shown a quarter turn or more further, by its Exif orientation: not a pixel of what
 * was scanned is touched.
 */

/** The orientation that shows a picture a quarter turn (clockwise) further than each does. */
const NEXT_ORIENTATION: Record<number, number> = {
	1: 6,
	6: 3,
	3: 8,
	8: 1,
	// the mirrored ones
	2: 7,
	7: 4,
	4: 5,
	5: 2
};

function turnedOrientation({ orientation, turn }: { orientation: number; turn: number }) {
	let turned = orientation;
	for (let quarter = 0; quarter < turn; quarter++) turned = NEXT_ORIENTATION[turned] ?? turned;
	return turned;
}

/** The whole of an Exif record that says only how a picture lies: one entry, big endian. */
const exifOf = (orientation: number) =>
	// prettier-ignore
	new Uint8Array([
		0x4d, 0x4d, 0, 42, 0, 0, 0, 8,
		0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0,
		0, 0, 0, 0
	]);

const ascii = (text: string) => new TextEncoder().encode(text);

function joined(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
	const all = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
	let at = 0;
	for (const part of parts) {
		all.set(part, at);
		at += part.length;
	}
	return all;
}

const viewOf = (bytes: Uint8Array) =>
	new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const ORIENTATION_TAG = 0x0112;

/**
 * Where an Exif record says how its picture lies, and what; `undefined` where it does not. Throws
 * `RangeError` for a broken one.
 */
function orientationIn(exif: Uint8Array) {
	const view = viewOf(exif);
	const little = view.getUint16(0) === 0x4949;
	const first = view.getUint32(4, little);
	const entries = view.getUint16(first, little);
	for (let entry = 0; entry < entries; entry++) {
		const at = first + 2 + entry * 12;
		if (view.getUint16(at, little) !== ORIENTATION_TAG) continue;
		return { at: at + 8, little, orientation: view.getUint16(at + 8, little) };
	}
	return undefined;
}

/** A part of a JPEG before its picture: what it is, and where it and what it holds begin and end. */
interface Segment {
	marker: number;
	from: number;
	data: number;
	to: number;
}

/** The segments of a JPEG up to its picture. */
function segmentsOf(bytes: Uint8Array) {
	const view = viewOf(bytes);
	const segments: Segment[] = [];
	let at = 2;
	while (at + 4 <= bytes.length && bytes[at] === 0xff) {
		const marker = bytes[at + 1];
		// the picture itself
		if (marker === 0xda) break;
		const to = at + 2 + view.getUint16(at + 2);
		segments.push({ marker, from: at, data: at + 4, to });
		at = to;
	}
	return segments;
}

const EXIF_HEADER = ascii('Exif\0\0');
const APP0 = 0xe0;
const APP1 = 0xe1;

/** A JPEG shown `turn` quarter turns (clockwise) further. */
export function turnJpeg({ bytes, turn }: { bytes: Uint8Array; turn: number }) {
	const segments = segmentsOf(bytes);
	const exif = segments.find(
		({ marker, data }) =>
			marker === APP1 && EXIF_HEADER.every((byte, index) => bytes[data + index] === byte)
	);
	const start = exif && exif.data + EXIF_HEADER.length;
	const said = exif && orientationIn(bytes.subarray(start, exif.to));
	if (said && start !== undefined) {
		const turned = new Uint8Array(bytes);
		const orientation = turnedOrientation({ orientation: said.orientation, turn });
		viewOf(turned).setUint16(start + said.at, orientation, said.little);
		return turned;
	}
	const record = joined([EXIF_HEADER, exifOf(turnedOrientation({ orientation: 1, turn }))]);
	const segment = joined([new Uint8Array([0xff, APP1, 0, record.length + 2]), record]);
	// JFIF comes first; an Exif record that says nothing of how the picture lies gives way
	const at = segments[0]?.marker === APP0 ? segments[0].to : 2;
	const rest = exif
		? [bytes.subarray(at, exif.from), bytes.subarray(exif.to)]
		: [bytes.subarray(at)];
	return joined([bytes.subarray(0, at), segment, ...rest]);
}

/** The checksum a PNG's chunks end in (CRC-32). */
function checksum(bytes: Uint8Array) {
	let sum = 0xffffffff;
	for (const byte of bytes) {
		sum ^= byte;
		for (let bit = 0; bit < 8; bit++) sum = (sum >>> 1) ^ (sum & 1 ? 0xedb88320 : 0);
	}
	return (sum ^ 0xffffffff) >>> 0;
}

function pngChunk({ type, data }: { type: string; data: Uint8Array }) {
	const chunk = joined([new Uint8Array(4), ascii(type), data, new Uint8Array(4)]);
	const view = viewOf(chunk);
	view.setUint32(0, data.length);
	view.setUint32(chunk.length - 4, checksum(chunk.subarray(4, -4)));
	return chunk;
}

/** Where a PNG's header ends: its signature and the chunk `IHDR`, always of the same length. */
const PNG_HEADER = 33;

/** Whether a PNG says how it lies, before its picture. */
function saysOrientation(bytes: Uint8Array) {
	const view = viewOf(bytes);
	for (let at = PNG_HEADER; at + 8 <= bytes.length; at += 12 + view.getUint32(at)) {
		const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
		if (type === 'eXIf') return true;
		if (type === 'IDAT') return false;
	}
	return false;
}

/**
 * A PNG shown `turn` quarter turns (clockwise) further; `undefined` for one that says how it lies
 * already, which no scanner writes and Node's canvas does not look at.
 */
export function turnPng({ bytes, turn }: { bytes: Uint8Array; turn: number }) {
	if (saysOrientation(bytes)) return undefined;
	const data = exifOf(turnedOrientation({ orientation: 1, turn }));
	return joined([
		bytes.subarray(0, PNG_HEADER),
		pngChunk({ type: 'eXIf', data }),
		bytes.subarray(PNG_HEADER)
	]);
}
