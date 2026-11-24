import {
	decodePDFRawStream,
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFName,
	PDFNull,
	PDFNumber,
	PDFRawStream,
	PDFRef,
	type PDFContext,
	type PDFObject
} from 'pdf-lib';
import { PageError } from '../errors';
import { entryOf, streamsOf, type PdfObjects } from './objects';
import { name } from './xref';

/**
 * A page as a file of its own. A stack may hold pages of several people, so nothing of one page comes along
 * with another: only what the page itself draws is taken (some scanners list the pictures of every page as
 * resources of each), and what points at other pages is not followed.
 */

/** What a page has of its own, or from the pages it is among (the first four). */
const INHERITED = ['Resources', 'MediaBox', 'CropBox', 'Rotate'] as const;
const PAGE_KEYS = ['Contents', 'UserUnit', 'Group'] as const;
/** What leads from a note on a page to elsewhere in the document. */
const LEADS_ELSEWHERE = ['P', 'Parent', 'Popup', 'IRT', 'A', 'AA', 'Dest', 'StructParent'];
const DOCUMENT_PARTS = ['Page', 'Pages', 'Catalog'].map(name);

/** More than any scanned page has, so a file made to be one does not take all memory. */
const MAX_OBJECTS = 20_000;
const MAX_BYTES = 256 * 1024 * 1024;
const MAX_DEPTH = 64;

/** A page and, for what it does not say itself, those it is among. */
export interface PageDicts {
	page: PDFDict;
	/** From the nearest. */
	among: readonly PDFDict[];
}

const typeOf = (dict: PDFDict) => dict.get(name('Type'));
const isForm = (object: unknown): object is PDFRawStream =>
	object instanceof PDFRawStream && object.dict.get(name('Subtype')) === name('Form');

/** The names of the pictures and forms a content draws (`/Name Do`). */
function drawnBy(streams: readonly (PDFObject | undefined)[]) {
	let text = '';
	for (const stream of streams) {
		if (!(stream instanceof PDFRawStream)) throw new PageError('A page without content');
		text += `${new TextDecoder('latin1').decode(decodePDFRawStream(stream).decode())}\n`;
	}
	const names = text.matchAll(/\/([^\s/[\]()<>{}%]+)\s+Do\b/g);
	return new Set([...names].map(([, drawn]) => PDFName.of(drawn)));
}

/** Copies objects into a document, each once. */
function createCopier({ objects, context }: { objects: PdfObjects; context: PDFContext }) {
	const copied = new Map<string, PDFRef>();
	let bytes = 0;

	async function copyDict({ dict, depth }: { dict: PDFDict; depth: number }) {
		const copy = PDFDict.withContext(context);
		for (const [key, value] of dict.entries()) {
			copy.set(key, await copyValue({ value, depth: depth + 1 }));
		}
		return copy;
	}

	async function copyStream({ stream, depth }: { stream: PDFRawStream; depth: number }) {
		bytes += stream.contents.length;
		if (bytes > MAX_BYTES) throw new PageError('A page too large');
		const dict = await copyDict({ dict: await ownDict(stream), depth });
		dict.set(name('Length'), PDFNumber.of(stream.contents.length));
		return PDFRawStream.of(dict, stream.contents);
	}

	/** A stream's dictionary; of a form, with no more than what it draws. */
	async function ownDict(stream: PDFRawStream) {
		const dict = stream.dict.clone();
		dict.delete(name('Length'));
		const resources = await entryOf({ objects, dict, key: 'Resources' });
		if (isForm(stream) && resources instanceof PDFDict) {
			dict.set(name('Resources'), await ownResources({ resources, streams: [stream] }));
		}
		return dict;
	}

	/** Resources with only the pictures and forms these streams draw, of those they list. */
	async function ownResources({
		resources,
		streams
	}: {
		resources: PDFDict;
		streams: readonly (PDFObject | undefined)[];
	}) {
		const listed = await entryOf({ objects, dict: resources, key: 'XObject' });
		if (!(listed instanceof PDFDict)) return resources;
		const own = PDFDict.withContext(context);
		const waiting = [...drawnBy(streams)];
		for (let drawn = waiting.shift(); drawn; drawn = waiting.shift()) {
			const value = listed.get(drawn);
			if (!value || own.has(drawn)) continue;
			own.set(drawn, value);
			const form = await objects.lookup(value);
			// one without resources of its own draws with these
			if (isForm(form) && !form.dict.has(name('Resources'))) waiting.push(...drawnBy([form]));
		}
		const replaced = resources.clone();
		replaced.set(name('XObject'), own);
		return replaced;
	}

	/** Something referred to: copied once, so it may lead back to itself. */
	async function copyReferred({ ref, depth }: { ref: PDFRef; depth: number }): Promise<PDFObject> {
		const known = copied.get(ref.toString());
		if (known) return known;
		if (copied.size > MAX_OBJECTS) throw new PageError('A page of too many parts');
		const object = await objects.lookup(ref);
		// other pages, and by them all of the document
		if (object instanceof PDFDict && DOCUMENT_PARTS.some((part) => part === typeOf(object))) {
			return PDFNull;
		}
		const target = context.nextRef();
		copied.set(ref.toString(), target);
		context.assign(target, await copyValue({ value: object, depth: depth + 1 }));
		return target;
	}

	async function copyValue({
		value,
		depth
	}: {
		value: PDFObject | undefined;
		depth: number;
	}): Promise<PDFObject> {
		if (depth > MAX_DEPTH) throw new PageError('A page nested too deeply');
		if (value === undefined) return PDFNull;
		if (value instanceof PDFRef) return copyReferred({ ref: value, depth });
		if (value instanceof PDFRawStream) return copyStream({ stream: value, depth });
		if (value instanceof PDFDict) return copyDict({ dict: value, depth });
		if (!(value instanceof PDFArray)) return value;
		const copy = PDFArray.withContext(context);
		for (const item of value.asArray())
			copy.push(await copyValue({ value: item, depth: depth + 1 }));
		return copy;
	}

	return { copy: (value: PDFObject | undefined) => copyValue({ value, depth: 0 }), ownResources };
}

/** The notes on a page (a signature drawn on it, say), without what leads elsewhere, links first of all. */
async function notesOn({ objects, page }: { objects: PdfObjects; page: PDFDict }) {
	const list = await entryOf({ objects, dict: page, key: 'Annots' });
	if (!(list instanceof PDFArray)) return [];
	const notes: PDFDict[] = [];
	for (const entry of list.asArray()) {
		const note = await objects.lookup(entry);
		if (!(note instanceof PDFDict) || note.get(name('Subtype')) === name('Link')) continue;
		const own = note.clone();
		for (const key of LEADS_ELSEWHERE) own.delete(name(key));
		notes.push(own);
	}
	return notes;
}

/** A page's own entry, or that of the nearest it is among. */
async function inherited({
	objects,
	dicts: { page, among },
	key
}: {
	objects: PdfObjects;
	dicts: PageDicts;
	key: string;
}) {
	for (const dict of [page, ...among]) {
		const value = await entryOf({ objects, dict, key });
		if (value) return value;
	}
	return undefined;
}

/** A page as a PDF of its own, the same bytes each time. Throws `PageError` where that cannot be. */
export async function copyPage({
	objects,
	dicts
}: {
	objects: PdfObjects;
	dicts: PageDicts;
}): Promise<Uint8Array<ArrayBuffer>> {
	// no date, so the same page is the same file
	const document = await PDFDocument.create({ updateMetadata: false });
	const { node } = document.addPage();
	node.delete(name('MediaBox'));
	const { copy, ownResources } = createCopier({ objects, context: document.context });
	const streams = await streamsOf({ objects, content: dicts.page.get(name('Contents')) });

	for (const key of INHERITED) {
		const value = await inherited({ objects, dicts, key });
		const own =
			key === 'Resources' && value instanceof PDFDict
				? await ownResources({ resources: value, streams })
				: value;
		if (own) node.set(name(key), await copy(own));
	}
	for (const key of PAGE_KEYS) {
		const value = dicts.page.get(name(key));
		if (value) node.set(name(key), await copy(value));
	}
	const notes = PDFArray.withContext(document.context);
	for (const note of await notesOn({ objects, page: dicts.page })) notes.push(await copy(note));
	if (notes.size() > 0) node.set(name('Annots'), notes);
	return new Uint8Array(
		await document.save({ addDefaultPage: false, updateFieldAppearances: false })
	);
}
