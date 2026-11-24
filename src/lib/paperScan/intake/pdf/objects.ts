import {
	PDFArray,
	PDFContext,
	PDFDict,
	PDFNumber,
	PDFObjectParser,
	PDFRawStream,
	PDFRef,
	type PDFObject
} from 'pdf-lib';
import type { ScanSource } from '../source';
import { BrokenTableError, name, parseIndirect, readTable, unpack, type ObjectTable } from './xref';

/**
 * The objects of a PDF, each read when asked for. The latest read are kept, up to `KEPT_BYTES`: a page asks
 * for its picture twice (whether it is a form, then to copy it), and pages share fonts. Nothing read is
 * changed, so one object may be handed out again.
 */
export interface PdfObjects {
	root: PDFObject | undefined;
	/** An object, or what one refers to. */
	lookup(object: PDFObject | undefined): Promise<PDFObject | undefined>;
}

/** No object of a scanned page is larger: an uncompressed colour page at 600 dpi has 105 MB. */
const MAX_OBJECT = 256 * 1024 * 1024;
/** References to references to … */
const MAX_HOPS = 32;
/** Object streams unpacked and kept: the objects of a page lie in one or two. */
const STREAMS_KEPT = 4;
/** Objects read and kept, together: a few scanned pages' pictures. */
const KEPT_BYTES = 96 * 1024 * 1024;
/** Larger ones are read again when asked for again. */
const KEPT_EACH = 48 * 1024 * 1024;

/** Where the object beginning at `at` ends: where the next begins. */
function endOf({ starts, at }: { starts: readonly number[]; at: number }) {
	let low = 0;
	let high = starts.length - 1;
	while (low < high) {
		const middle = (low + high) >> 1;
		if (starts[middle] > at) high = middle;
		else low = middle + 1;
	}
	return starts[low];
}

function createReader({
	source,
	table,
	context
}: {
	source: ScanSource;
	table: ObjectTable;
	context: PDFContext;
}) {
	const streams = new Map<number, { offsets: number[]; bytes: Uint8Array<ArrayBuffer> }>();
	/** The latest objects read, the latest used last. */
	const kept = new Map<number, { object: PDFObject; size: number }>();
	let keptBytes = 0;

	function keep({ number, object, size }: { number: number; object: PDFObject; size: number }) {
		if (size > KEPT_EACH) return;
		kept.set(number, { object, size });
		keptBytes += size;
		for (const [oldest, { size: freed }] of kept) {
			if (keptBytes <= KEPT_BYTES) break;
			kept.delete(oldest);
			keptBytes -= freed;
		}
	}

	async function readAt({ number, at }: { number: number; at: number }) {
		const known = kept.get(number);
		if (known) {
			kept.delete(number);
			kept.set(number, known);
			return known.object;
		}
		const to = endOf({ starts: table.starts, at });
		if (to - at > MAX_OBJECT) throw new BrokenTableError('An object larger than any page');
		const read = parseIndirect({ bytes: await source.read({ from: at, to }), context });
		if (read.number !== number) throw new BrokenTableError('Another object where one should be');
		keep({ number, object: read.object, size: to - at });
		return read.object;
	}

	/** An object stream: where in it each of its objects begins. */
	async function openStream(number: number) {
		const known = streams.get(number);
		if (known) return known;
		const place = table.places.get(number);
		const stream = place && 'at' in place ? await readAt({ number, at: place.at }) : undefined;
		if (!(stream instanceof PDFRawStream)) throw new BrokenTableError('No objects where some are');
		const first = stream.dict.get(name('First'));
		const from = first instanceof PDFNumber ? first.asNumber() : 0;
		const bytes = new Uint8Array(unpack(stream));
		const numbers = new TextDecoder('latin1')
			.decode(bytes.subarray(0, from))
			.split(/\s+/)
			.filter(Boolean)
			.map(Number);
		const offsets = numbers.filter((_, index) => index % 2 === 1).map((offset) => from + offset);
		const opened = { offsets, bytes };
		streams.set(number, opened);
		for (const oldest of streams.keys()) {
			if (streams.size <= STREAMS_KEPT) break;
			streams.delete(oldest);
		}
		return opened;
	}

	return async function readObject(number: number): Promise<PDFObject | undefined> {
		const place = table.places.get(number);
		if (!place) return undefined;
		if ('at' in place) return readAt({ number, at: place.at });
		const { offsets, bytes } = await openStream(place.stream);
		const from = offsets[place.index];
		if (from === undefined) throw new BrokenTableError('No object where one should be');
		return PDFObjectParser.forBytes(bytes.subarray(from), context).parseObject();
	};
}

/**
 * Opens a PDF by its table. Throws `BrokenTableError` where that does not work out.
 */
export async function openObjects(
	source: ScanSource
): Promise<PdfObjects & { encrypted: boolean }> {
	const context = PDFContext.create();
	const table = await readTable({ source, context });
	const readObject = createReader({ source, table, context });

	async function lookup(object: PDFObject | undefined) {
		let found = object;
		for (let hop = 0; found instanceof PDFRef; hop++) {
			if (hop > MAX_HOPS) throw new BrokenTableError('References that lead nowhere');
			found = await readObject(found.objectNumber);
		}
		return found;
	}

	return {
		root: await lookup(table.trailer.get(name('Root'))),
		encrypted: table.trailer.has(name('Encrypt')),
		lookup
	};
}

/** A dictionary's entry, whatever it refers to. */
export const entryOf = ({
	objects,
	dict,
	key
}: {
	objects: Pick<PdfObjects, 'lookup'>;
	dict: PDFDict;
	key: string;
}) => objects.lookup(dict.get(name(key)));

/** The streams of a page's or form's content, which may be one or a list. */
export async function streamsOf({
	objects,
	content
}: {
	objects: Pick<PdfObjects, 'lookup'>;
	content: PDFObject | undefined;
}): Promise<(PDFObject | undefined)[]> {
	const found = await objects.lookup(content);
	if (!(found instanceof PDFArray)) return found ? [found] : [];
	return Promise.all(found.asArray().map((part) => objects.lookup(part)));
}
