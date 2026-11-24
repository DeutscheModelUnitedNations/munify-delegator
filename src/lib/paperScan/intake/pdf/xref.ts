import {
	decodePDFRawStream,
	PDFArray,
	PDFContext,
	PDFDict,
	PDFName,
	PDFNumber,
	PDFObjectParser,
	PDFRawStream,
	PDFRef,
	type PDFObject
} from 'pdf-lib';
import type { ScanSource } from '../source';

/**
 * Where a PDF's objects are: its cross-reference tables and streams, the newest first, as they lie at the
 * end of the file. Read piece by piece, so a file of any size costs no more than its table.
 */

/** Thrown for a file whose table says nothing sensible: it may be told without one, all in memory. */
export class BrokenTableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BrokenTableError';
	}
}

/** Where an object is: at a place in the file, or one of those in an object stream. */
export type ObjectPlace = { at: number } | { stream: number; index: number };

export interface ObjectTable {
	places: ReadonlyMap<number, ObjectPlace>;
	trailer: PDFDict;
	/** Where objects and tables begin, in order: each ends before the next begins. */
	starts: readonly number[];
}

export const name = (text: string) => PDFName.of(text);

const numberIn = ({ dict, key }: { dict: PDFDict; key: string }) => {
	const value = dict.get(name(key));
	return value instanceof PDFNumber ? value.asNumber() : undefined;
};

/** How far from the end the table's place is told, and how far in a file may begin. */
const TAIL = 64 * 1024;
const HEAD = 1024;
/** No table is larger: a million objects. */
const MAX_TABLE = 64 * 1024 * 1024;
const MAX_TABLES = 1000;
const MAX_OBJECTS = 2_000_000;

const latin1 = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

/** Reads from a place on, more and more of it, until `parse` makes something of it. */
async function readGrowing<T>({
	source,
	at,
	parse
}: {
	source: ScanSource;
	at: number;
	parse: (bytes: Uint8Array<ArrayBuffer>) => T;
}): Promise<T> {
	for (let length = 64 * 1024; ; length *= 4) {
		const to = Math.min(at + length, source.size);
		const bytes = await source.read({ from: at, to });
		try {
			return parse(bytes);
		} catch (error) {
			if (to === source.size || length >= MAX_TABLE) throw error;
		}
	}
}

/** An object as it is written in a file: `12 0 obj …`. */
export function parseIndirect({
	bytes,
	context
}: {
	bytes: Uint8Array<ArrayBuffer>;
	context: PDFContext;
}): { number: number; object: PDFObject } {
	const header = /^\s*(\d+)\s+\d+\s+obj/.exec(latin1(bytes.subarray(0, 64)));
	if (!header) throw new BrokenTableError('No object where one should be');
	const object = PDFObjectParser.forBytes(bytes.subarray(header[0].length), context).parseObject();
	return { number: Number(header[1]), object };
}

/** Undoes what makes a table's rows easier to compress (PNG predictors). */
function unpredict({ bytes, columns }: { bytes: Uint8Array; columns: number }) {
	const rows = Math.floor(bytes.length / (columns + 1));
	const plain = new Uint8Array(rows * columns);
	const before = (row: number, column: number) =>
		row < 0 || column < 0 ? 0 : plain[row * columns + column];
	const predicted: Record<number, (row: number, column: number) => number> = {
		0: () => 0,
		1: (row, column) => before(row, column - 1),
		2: (row, column) => before(row - 1, column),
		3: (row, column) => (before(row, column - 1) + before(row - 1, column)) >> 1
	};
	for (let row = 0; row < rows; row++) {
		const start = row * (columns + 1);
		const predict = predicted[bytes[start]];
		if (!predict) throw new BrokenTableError('A table packed in a way not known');
		for (let column = 0; column < columns; column++) {
			plain[row * columns + column] = bytes[start + 1 + column] + predict(row, column);
		}
	}
	return plain;
}

/** A stream unpacked, with the rows of a table as they are. */
export function unpack(stream: PDFRawStream) {
	const bytes = decodePDFRawStream(stream).decode();
	const parms = stream.dict.get(name('DecodeParms'));
	const only = parms instanceof PDFArray ? parms.get(0) : parms;
	if (!(only instanceof PDFDict) || (numberIn({ dict: only, key: 'Predictor' }) ?? 1) < 10)
		return bytes;
	return unpredict({ bytes, columns: numberIn({ dict: only, key: 'Columns' }) ?? 1 });
}

interface Section {
	places: Map<number, ObjectPlace | null>;
	dict: PDFDict;
}

/** A table as text: `xref`, its entries, `trailer`. */
function parseTextTable({
	bytes,
	context,
	base
}: {
	bytes: Uint8Array<ArrayBuffer>;
	context: PDFContext;
	base: number;
}): Section {
	const text = latin1(bytes);
	const end = text.indexOf('trailer');
	if (end < 0) throw new BrokenTableError('A table without an end');
	const words = text
		.slice(text.indexOf('xref') + 4, end)
		.split(/\s+/)
		.filter(Boolean);
	const places = new Map<number, ObjectPlace | null>();
	for (let at = 0; at + 1 < words.length;) {
		const first = Number(words[at]);
		const count = Number(words[at + 1]);
		if (!Number.isInteger(first) || !Number.isInteger(count)) {
			throw new BrokenTableError('A table that is none');
		}
		at += 2;
		for (let index = 0; index < count && at + 2 < words.length + 1; index++, at += 3) {
			const used = words[at + 2] === 'n';
			places.set(first + index, used ? { at: base + Number(words[at]) } : null);
		}
	}
	const dict = PDFObjectParser.forBytes(bytes.subarray(end + 7), context).parseObject();
	if (!(dict instanceof PDFDict)) throw new BrokenTableError('A table without a trailer');
	return { places, dict };
}

/** A list of numbers of a dictionary. */
function numbersIn({ dict, key }: { dict: PDFDict; key: string }) {
	const list = dict.get(name(key));
	if (!(list instanceof PDFArray)) return undefined;
	return list.asArray().map((item) => (item instanceof PDFNumber ? item.asNumber() : 0));
}

/** The rows of a table, each of three numbers as wide as `widths` say; the first is 1 where it has none. */
function* rowsOf({ bytes, widths }: { bytes: Uint8Array; widths: readonly number[] }) {
	const length = widths.reduce((sum, width) => sum + width, 0);
	for (let start = 0; length > 0 && start + length <= bytes.length; start += length) {
		let at = start;
		const [type, second, third] = widths.map((width) => {
			const end = at + width;
			let value = 0;
			for (; at < end; at++) value = value * 256 + bytes[at];
			return value;
		});
		yield { type: widths[0] === 0 ? 1 : type, second, third };
	}
}

/** The objects a table is of: from a first on, so many, and again. */
function* numbersOf(index: readonly number[]) {
	for (let part = 0; part + 1 < index.length; part += 2) {
		for (let row = 0; row < index[part + 1]; row++) yield index[part] + row;
	}
}

/** A table as a stream, which newer writers make. */
function parseStreamTable({
	bytes,
	context,
	base
}: {
	bytes: Uint8Array<ArrayBuffer>;
	context: PDFContext;
	base: number;
}): Section {
	const { object } = parseIndirect({ bytes, context });
	if (!(object instanceof PDFRawStream)) throw new BrokenTableError('A table that is none');
	const { dict } = object;
	const widths = numbersIn({ dict, key: 'W' });
	if (widths?.length !== 3) throw new BrokenTableError('A table without widths');
	const index = numbersIn({ dict, key: 'Index' }) ?? [0, numberIn({ dict, key: 'Size' }) ?? 0];
	const numbers = numbersOf(index);
	const places = new Map<number, ObjectPlace | null>();
	for (const { type, second, third } of rowsOf({ bytes: unpack(object), widths })) {
		const number = numbers.next();
		if (number.done) break;
		const known: Record<number, ObjectPlace> = {
			1: { at: base + second },
			2: { stream: second, index: third }
		};
		places.set(number.value, known[type] ?? null);
	}
	return { places, dict };
}

const parseSection = (args: Parameters<typeof parseTextTable>[0]) =>
	/^\s*xref/.test(latin1(args.bytes.subarray(0, 32)))
		? parseTextTable(args)
		: parseStreamTable(args);

/** Where a file begins (scanners may write something before `%PDF`), and where its newest table is. */
async function endsOf(source: ScanSource) {
	const head = latin1(await source.read({ from: 0, to: Math.min(HEAD + 8, source.size) }));
	const tail = latin1(
		await source.read({ from: Math.max(0, source.size - TAIL), to: source.size })
	);
	const last = [...tail.matchAll(/startxref\s+(\d+)/g)].at(-1);
	if (!last) throw new BrokenTableError('The file does not say where its table is');
	return { base: Math.max(0, head.indexOf('%PDF')), newest: Number(last[1]) };
}

/** Every table of a file, the newest first. */
async function* sectionsOf({
	source,
	context,
	base,
	newest
}: {
	source: ScanSource;
	context: PDFContext;
	base: number;
	newest: number;
}) {
	const waiting = [newest];
	const seen = new Set<number>();
	for (let at = waiting.shift(); at !== undefined; at = waiting.shift()) {
		if (seen.has(at)) continue;
		seen.add(at);
		const place = base + at;
		if (seen.size > MAX_TABLES || place >= source.size) {
			throw new BrokenTableError('Tables that lead nowhere');
		}
		const section = await readGrowing({
			source,
			at: place,
			parse: (bytes) => parseSection({ bytes, context, base })
		});
		yield { ...section, at: place };
		// what a table of both kinds says goes before older ones
		for (const key of ['XRefStm', 'Prev']) {
			const next = numberIn({ dict: section.dict, key });
			if (next !== undefined) waiting.push(next);
		}
	}
}

/** What the tables say together: the newer goes before the older. */
async function mergedSections(args: Parameters<typeof sectionsOf>[0]) {
	const places = new Map<number, ObjectPlace | null>();
	const starts: number[] = [];
	let trailer: PDFDict | undefined;
	for await (const section of sectionsOf(args)) {
		trailer ??= section.dict;
		starts.push(section.at);
		for (const [number, place] of section.places) {
			if (!places.has(number)) places.set(number, place);
		}
		if (places.size > MAX_OBJECTS) throw new BrokenTableError('More objects than any scan has');
	}
	return { places, starts, trailer };
}

/** Where the objects of a file are. Throws `BrokenTableError` where it does not say. */
export async function readTable({
	source,
	context
}: {
	source: ScanSource;
	context: PDFContext;
}): Promise<ObjectTable> {
	const { places, starts, trailer } = await mergedSections({
		source,
		context,
		...(await endsOf(source))
	});
	if (!(trailer?.get(name('Root')) instanceof PDFRef)) {
		throw new BrokenTableError('A table without a document');
	}
	const used = new Map<number, ObjectPlace>();
	for (const [number, place] of places) {
		if (!place) continue;
		used.set(number, place);
		if ('at' in place) starts.push(place.at);
	}
	starts.push(source.size);
	return { places: used, trailer, starts: starts.sort((a, b) => a - b) };
}
