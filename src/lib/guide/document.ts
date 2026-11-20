import { z } from 'zod';

/**
 * A guide page's text: a TipTap document (JSON) of the guide's node set (`GUIDE_NODES`). Files and
 * other pages are named by reference (`file:<id>`, `guide:<pageId>`) and resolved for each reader;
 * placeholders (`{{Gremium}}`) are filled in for them.
 */

export type GuideMark = { type: string; attrs?: Record<string, unknown> };
export type GuideNode = {
	type: string;
	attrs?: Record<string, unknown>;
	content?: GuideNode[];
	marks?: GuideMark[];
	text?: string;
};
export type GuideDocument = { type: 'doc'; content?: GuideNode[] };

/** The nodes a guide page may hold. */
const GUIDE_NODES = [
	'doc',
	'paragraph',
	'text',
	'heading',
	'bulletList',
	'orderedList',
	'listItem',
	'blockquote',
	'horizontalRule',
	'hardBreak',
	'image',
	'callout',
	'toggle',
	'button',
	'embed'
] as const;

/** The marks a guide page may hold. */
const GUIDE_MARKS = ['bold', 'italic', 'underline', 'strike', 'code', 'link'] as const;

/** The blocks Markdown has no syntax for: kept only when the page is written as TipTap JSON. */
export const RICH_BLOCKS = ['callout', 'toggle', 'button', 'embed'] as const;

const MAX_DEPTH = 30;

const markSchema = z.object({
	type: z.enum(GUIDE_MARKS),
	attrs: z.record(z.string(), z.unknown()).optional()
});

const nodeSchema: z.ZodType<GuideNode> = z.lazy(() =>
	z.object({
		type: z.enum(GUIDE_NODES),
		attrs: z.record(z.string(), z.unknown()).optional(),
		content: z.array(nodeSchema).optional(),
		marks: z.array(markSchema).optional(),
		text: z.string().optional()
	})
);

function depthOf(node: GuideNode | GuideDocument): number {
	return 1 + Math.max(0, ...(node.content ?? []).map(depthOf));
}

/** A guide page's document; refuses unknown nodes and marks, and too deep nesting. */
export const guideDocumentSchema = z
	.object({ type: z.literal('doc'), content: z.array(nodeSchema).optional() })
	.refine((doc) => depthOf(doc) <= MAX_DEPTH, { message: 'The document is nested too deep.' })
	.refine((doc) => JSON.stringify(doc).length <= 2_000_000, {
		message: 'The document is too long.'
	});

export const EMPTY_DOCUMENT: GuideDocument = { type: 'doc', content: [{ type: 'paragraph' }] };

/** The document a column holds, or the empty one for anything else. */
export function parseGuideDocument(value: unknown): GuideDocument {
	const parsed = guideDocumentSchema.safeParse(value);
	return parsed.success ? parsed.data : EMPTY_DOCUMENT;
}

/** Visits every node, depth first. */
function walk(node: GuideNode | GuideDocument, visit: (node: GuideNode) => void) {
	for (const child of node.content ?? []) {
		visit(child);
		walk(child, visit);
	}
}

/** A copy of the document with every node replaced by what `map` makes of it (children first). */
export function mapNodes(
	doc: GuideDocument,
	map: (node: GuideNode) => GuideNode | GuideNode[] | null
): GuideDocument {
	const mapList = (nodes: GuideNode[] | undefined): GuideNode[] | undefined =>
		nodes?.flatMap((node) => {
			const mapped = map(node.content ? { ...node, content: mapList(node.content) } : node);
			if (mapped === null) return [];
			return Array.isArray(mapped) ? mapped : [mapped];
		});
	return { ...doc, content: mapList(doc.content) };
}

const FILE_PREFIX = 'file:';
const PAGE_PREFIX = 'guide:';

/** The file id of a `file:<id>` reference, or undefined. */
export function fileIdOf(href: unknown) {
	return typeof href === 'string' && href.startsWith(FILE_PREFIX)
		? href.slice(FILE_PREFIX.length) || undefined
		: undefined;
}

/** The page id of a `guide:<pageId>` reference, or undefined. */
export function pageIdOf(href: unknown) {
	return typeof href === 'string' && href.startsWith(PAGE_PREFIX)
		? href.slice(PAGE_PREFIX.length) || undefined
		: undefined;
}

export const fileHref = (fileId: string) => `${FILE_PREFIX}${fileId}`;

/** The references a node carries: an image's `src`, a link's or a button's `href`. */
function referencesOf(node: GuideNode) {
	const refs: unknown[] = [];
	if (node.type === 'image') refs.push(node.attrs?.src);
	if (node.type === 'button') refs.push(node.attrs?.href);
	for (const mark of node.marks ?? []) if (mark.type === 'link') refs.push(mark.attrs?.href);
	return refs;
}

/** The files a document names. */
export function referencedFileIds(doc: GuideDocument) {
	const ids = new Set<string>();
	walk(doc, (node) => {
		for (const ref of referencesOf(node)) {
			const id = fileIdOf(ref);
			if (id) ids.add(id);
		}
	});
	return [...ids];
}

/** The pages a document links to. */
export function referencedPageIds(doc: GuideDocument) {
	const ids = new Set<string>();
	walk(doc, (node) => {
		for (const ref of referencesOf(node)) {
			const id = pageIdOf(ref);
			if (id) ids.add(id);
		}
	});
	return [...ids];
}

/** The rich blocks (`RICH_BLOCKS`) a document holds, each once. */
export function richBlocksIn(doc: GuideDocument) {
	const found = new Set<string>();
	walk(doc, (node) => {
		if ((RICH_BLOCKS as readonly string[]).includes(node.type)) found.add(node.type);
	});
	return [...found];
}

/** The plain text of a node. */
function textOf(node: GuideNode | GuideDocument): string {
	if ('text' in node && typeof node.text === 'string') return node.text;
	const separator = node.type === 'doc' ? '\n' : '';
	return (node.content ?? []).map(textOf).join(separator);
}

// --- Placeholders -----------------------------------------------------------------------------

export const PLACEHOLDERS = ['Konferenz', 'Gremium', 'Themen'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/** Placeholders that need a committee: only in pages of the committee template. */
export const COMMITTEE_PLACEHOLDERS: readonly Placeholder[] = ['Gremium', 'Themen'];

const PLACEHOLDER_PATTERN = /\{\{\s*(Konferenz|Gremium|Themen)\s*\}\}/g;

/** The placeholders a document uses. */
export function placeholdersIn(doc: GuideDocument): Placeholder[] {
	const found = new Set<Placeholder>();
	walk(doc, (node) => {
		for (const match of (node.text ?? '').matchAll(PLACEHOLDER_PATTERN)) {
			const name = PLACEHOLDERS.find((placeholder) => placeholder === match[1]);
			if (name) found.add(name);
		}
	});
	return [...found];
}

export type PlaceholderValues = {
	conference: string;
	/** Unknown outside a committee section: the placeholder stays as it is. */
	committee?: { name: string; agendaItems: readonly string[] };
};

/**
 * Fills in the placeholders. `{{Themen}}` alone in a paragraph becomes a list of the agenda items;
 * elsewhere it lists them in one line. Without a committee the committee placeholders stay.
 */
export function fillPlaceholders(doc: GuideDocument, values: PlaceholderValues): GuideDocument {
	const replace = (text: string) =>
		text.replace(PLACEHOLDER_PATTERN, (whole, name: string) => {
			if (name === 'Konferenz') return values.conference;
			if (!values.committee) return whole;
			return name === 'Gremium' ? values.committee.name : values.committee.agendaItems.join(', ');
		});
	const committee = values.committee;
	// first the lists, while the paragraph still reads `{{Themen}}`, then the text
	const withLists = committee
		? mapNodes(doc, (node) =>
				node.type === 'paragraph' &&
				node.content?.length === 1 &&
				/^\s*\{\{\s*Themen\s*\}\}\s*$/.test(node.content[0].text ?? '')
					? {
							type: 'bulletList',
							content: committee.agendaItems.map((title) => ({
								type: 'listItem',
								content: [{ type: 'paragraph', content: [{ type: 'text', text: title }] }]
							}))
						}
					: node
			)
		: doc;
	return mapNodes(withLists, (node) =>
		node.type === 'text' && node.text ? { ...node, text: replace(node.text) } : node
	);
}

// --- Headings ---------------------------------------------------------------------------------

export type GuideHeading = { id: string; level: number; text: string };

/** A heading's anchor: its text, lower case, dashes for anything else. */
function headingSlug(text: string) {
	return (
		text
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'abschnitt'
	);
}

/** The headings, for the table of contents, with unique anchors in document order. */
export function headingsOf(doc: GuideDocument): GuideHeading[] {
	const headings: GuideHeading[] = [];
	const used = new Map<string, number>();
	walk(doc, (node) => {
		if (node.type !== 'heading') return;
		const text = textOf(node).trim();
		if (!text) return;
		const base = headingSlug(text);
		const count = used.get(base) ?? 0;
		used.set(base, count + 1);
		const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 2;
		headings.push({ id: count === 0 ? base : `${base}-${count + 1}`, level, text });
	});
	return headings;
}

/** Whether a URL is one a reader may open: http(s), mail, or a reference resolved per reader. */
export function isSafeHref(href: unknown): href is string {
	return (
		typeof href === 'string' &&
		(/^(https?:|mailto:)/i.test(href) ||
			fileIdOf(href) !== undefined ||
			pageIdOf(href) !== undefined ||
			href.startsWith('#') ||
			href.startsWith('/'))
	);
}

/** The video id of a YouTube URL, or undefined for any other URL. */
export function youtubeIdOf(url: unknown) {
	if (typeof url !== 'string') return undefined;
	const match =
		/^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/.exec(
			url
		);
	return match?.[1];
}
