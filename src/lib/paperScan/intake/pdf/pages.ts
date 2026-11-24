import { PDFArray, PDFDict, PDFDocument, PDFNumber, PDFRef, type PDFObject } from 'pdf-lib';
import { bufferedSource, type ScanSource } from '../source';
import { messageOf, PageError, ScanUnreadableError, SourceReadError } from '../errors';
import { copyPage, type PageDicts } from './copyPage';
import { entryOf, openObjects, type PdfObjects } from './objects';
import { BrokenTableError, name } from './xref';

/**
 * The pages of a PDF one by one, each as a file of its own, whatever the size of the whole: only its table
 * and the page in hand are in memory.
 */

/** A file without a sensible table is told by all it holds, which is in memory for that. */
const REPAIRED_UP_TO = 100 * 1024 * 1024;
const MAX_DEPTH = 64;

/** A page in its place, and how to get it. */
export interface PdfPage {
	page: number;
	/** The page as a PDF. Throws `PageError` where it cannot be one. */
	cut: () => Promise<Uint8Array<ArrayBuffer>>;
}

/** Opens a PDF without its table, all of it in memory. */
async function repaired(source: ScanSource): Promise<PdfObjects & { encrypted: boolean }> {
	if (source.size > REPAIRED_UP_TO)
		throw new ScanUnreadableError('The table of a large file is broken');
	try {
		const { context } = await PDFDocument.load(await source.read({ from: 0, to: source.size }), {
			ignoreEncryption: true,
			updateMetadata: false
		});
		const lookup = async (object: PDFObject | undefined) =>
			object instanceof PDFRef ? context.lookup(object) : object;
		return {
			root: await lookup(context.trailerInfo.Root),
			encrypted: context.trailerInfo.Encrypt !== undefined,
			lookup
		};
	} catch (error) {
		throw new ScanUnreadableError(messageOf(error));
	}
}

/** The tree of pages of an opened document. */
async function pagesOf(objects: PdfObjects) {
	const { root } = objects;
	const tree =
		root instanceof PDFDict ? await entryOf({ objects, dict: root, key: 'Pages' }) : root;
	if (!(tree instanceof PDFDict)) throw new BrokenTableError('A document without pages');
	return tree;
}

async function open(source: ScanSource) {
	const buffered = bufferedSource(source);
	let objects: PdfObjects & { encrypted: boolean };
	let tree: PDFDict;
	try {
		objects = await openObjects(buffered);
		tree = await pagesOf(objects);
	} catch (error) {
		// what failed to be read (the bucket, the network) may be there later
		if (error instanceof SourceReadError) throw error;
		objects = await repaired(source);
		try {
			tree = await pagesOf(objects);
		} catch {
			throw new ScanUnreadableError('A document without pages');
		}
	}
	if (objects.encrypted) throw new ScanUnreadableError('The file is encrypted');
	return { objects, tree };
}

/** Tells a failure to read the file from one to make sense of it. */
const reliable = (source: ScanSource): ScanSource => ({
	size: source.size,
	read: (range) =>
		source.read(range).catch((error: unknown) => {
			throw new SourceReadError(error);
		})
});

/** How many pages a node of the tree says it holds; a page holds itself. */
function countOf(node: PDFDict) {
	if (!node.has(name('Kids'))) return 1;
	const count = node.get(name('Count'));
	return count instanceof PDFNumber ? count.asNumber() : undefined;
}

/** A place in the tree: a node, those it is among, and the first page of it that is asked for, from 1. */
interface Place {
	node: PDFDict;
	among: readonly PDFDict[];
	from: number;
}

/** The nodes below one from its page `from` on, and how many pages of the first are before that. */
async function* nodesFrom({
	objects,
	node,
	kids,
	from
}: {
	objects: PdfObjects;
	node: PDFDict;
	kids: PDFArray;
	from: number;
}) {
	let skip = from - 1;
	// as many as pages: each is one, and need not be looked at to be left out
	const left = countOf(node) === kids.size() ? Math.min(skip, kids.size()) : 0;
	skip -= left;
	for (const kid of kids.asArray().slice(left)) {
		const child = await lookupNode({ objects, kid });
		const count = child ? countOf(child) : 1;
		if (count !== undefined && count <= skip) {
			skip -= count;
		} else {
			yield { child, skip };
			skip = 0;
		}
	}
}

/**
 * The pages below a node, each with those it is among; `undefined` for one that is not there, which the
 * others do not suffer from.
 */
async function* walk({
	objects,
	place: { node, among, from }
}: {
	objects: PdfObjects;
	place: Place;
}): AsyncGenerator<PageDicts | undefined> {
	if (among.length > MAX_DEPTH) throw new PageError('Pages nested too deeply');
	const kids = await entryOf({ objects, dict: node, key: 'Kids' });
	if (!(kids instanceof PDFArray)) {
		if (from <= 1) yield { page: node, among };
		return;
	}
	for await (const { child, skip } of nodesFrom({ objects, node, kids, from })) {
		if (child) {
			const below = { node: child, among: [node, ...among], from: skip + 1 };
			yield* walk({ objects, place: below });
		} else yield undefined;
	}
}

/** A node of the tree; `undefined` for one that is not there. */
async function lookupNode({ objects, kid }: { objects: PdfObjects; kid: PDFObject }) {
	try {
		const node = await objects.lookup(kid);
		return node instanceof PDFDict ? node : undefined;
	} catch (error) {
		if (error instanceof SourceReadError) throw error;
		return undefined;
	}
}

/** Makes a page a file of its own; whatever is wrong with it is that page's. */
async function cutPage({ objects, dicts }: { objects: PdfObjects; dicts: PageDicts | undefined }) {
	if (!dicts) throw new PageError('A page that is not there');
	try {
		return await copyPage({ objects, dicts });
	} catch (error) {
		if (error instanceof SourceReadError) throw error;
		throw new PageError(messageOf(error));
	}
}

/**
 * The pages of a PDF from page `from` (1) on. Throws `ScanUnreadableError` for one that cannot be opened, or
 * whose pages end in nothing, and `SourceReadError` when the file could not be read.
 */
export async function* pdfPages({
	source,
	from = 1
}: {
	source: ScanSource;
	from?: number;
}): AsyncGenerator<PdfPage> {
	const { objects, tree } = await open(reliable(source));
	let page = from;
	try {
		for await (const dicts of walk({ objects, place: { node: tree, among: [], from } })) {
			yield { page, cut: () => cutPage({ objects, dicts }) };
			page += 1;
		}
	} catch (error) {
		if (error instanceof SourceReadError) throw error;
		throw new ScanUnreadableError(messageOf(error));
	}
}
