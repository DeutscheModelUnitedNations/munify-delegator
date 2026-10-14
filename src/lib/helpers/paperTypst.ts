/**
 * Serialize a position/introduction paper (TipTap / ProseMirror JSON) to a
 * complete, self-contained Typst source document.
 *
 * The node/mark set handled here is bounded by the editor configuration in
 * `ReadOnlyContent.svelte` + `getCommonExtensions()`:
 *   nodes: doc, paragraph, heading (levels 2,3), bulletList, orderedList,
 *          listItem, blockquote, hardBreak
 *   marks: bold, italic, underline, superscript, subscript, link
 * Keep this in sync if the editor extensions change. Unknown nodes degrade
 * gracefully (children are still rendered).
 *
 * The document is text-only (no images/assets), so it compiles with the
 * bundled Typst 0.10 without any side files.
 */

interface TipTapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

interface TipTapNode {
	type?: string;
	content?: TipTapNode[];
	text?: string;
	marks?: TipTapMark[];
	attrs?: Record<string, unknown>;
}

export interface PaperTypstMeta {
	/** Conference display name (shown large, centered). */
	conferenceName: string;
	/** Already-translated paper type label. */
	paperType: string;
	/** Authoring nation / NSA display name. */
	entityName?: string;
	/** Pre-composed committee line, e.g. "General Assembly (GA)". */
	committeeLine?: string;
	/** Localized "Committee" label. */
	committeeLabel: string;
	/** Agenda item / topic title. */
	topic?: string;
	/** Localized "Topic" label. */
	topicLabel: string;
	/** Pre-composed disclaimer sentence for the page footer. */
	disclaimer: string;
}

/**
 * Escape text for use inside a Typst content block (`[ … ]`). Backslash first,
 * then every character that would otherwise start inline/structural markup.
 */
function escapeText(value: string): string {
	return value.replace(/[\\#$*_`<>@~[\]]/g, (c) => `\\${c}`);
}

/** Escape a string for use inside a Typst double-quoted string literal. */
function escapeString(value: string): string {
	return value.replace(/[\\"]/g, (c) => `\\${c}`);
}

function attrString(attrs: Record<string, unknown> | undefined, key: string): string | undefined {
	const v = attrs?.[key];
	return typeof v === 'string' ? v : undefined;
}

function attrNumber(attrs: Record<string, unknown> | undefined, key: string): number | undefined {
	const v = attrs?.[key];
	return typeof v === 'number' ? v : undefined;
}

/** How each supported mark wraps the content it applies to. */
const MARK_WRAPPERS = new Map<string, (content: string, mark: TipTapMark) => string>([
	['bold', (content) => `#strong[${content}]`],
	['italic', (content) => `#emph[${content}]`],
	['underline', (content) => `#underline[${content}]`],
	['superscript', (content) => `#super[${content}]`],
	['subscript', (content) => `#sub[${content}]`],
	[
		'link',
		(content, mark) => `#link("${escapeString(attrString(mark.attrs, 'href') ?? '')}")[${content}]`
	]
]);

/** Wraps the content in its marks, in order; unknown marks are left out. */
function applyMarks(content: string, marks: TipTapMark[] | undefined): string {
	return (marks ?? []).reduce(
		(out, mark) => MARK_WRAPPERS.get(mark.type)?.(out, mark) ?? out,
		content
	);
}

function isTextNode(node: TipTapNode): boolean {
	return node.type === 'text' || typeof node.text === 'string';
}

/** Render one inline node (text or hardBreak) into Typst content. */
function renderInlineNode(node: TipTapNode): string {
	if (node.type === 'hardBreak') return '#linebreak()';
	// Unexpected inline child — fall back to its own inline content.
	if (!isTextNode(node)) return renderInline(node.content);
	return applyMarks(escapeText(node.text ?? ''), node.marks);
}

/** Render an array of inline nodes (text + hardBreak) into Typst content. */
function renderInline(nodes: TipTapNode[] | undefined): string {
	if (!nodes) return '';
	return nodes.map(renderInlineNode).join('');
}

function childrenOf(node: TipTapNode): TipTapNode[] {
	return node.content ?? [];
}

/** Render a node's block children, leaving out the ones that render to nothing. */
function renderBlocks(nodes: TipTapNode[], separator: string): string {
	return nodes
		.map((child) => renderBlock(child))
		.filter((s) => s.length > 0)
		.join(separator);
}

/** Render the inline content of a list item (its block children, flattened). */
function renderListItem(item: TipTapNode): string {
	return renderBlocks(childrenOf(item), '\n');
}

function renderListItems(list: TipTapNode): string {
	return childrenOf(list)
		.map((li) => `[${renderListItem(li)}]`)
		.join(', ');
}

/** How each supported block node renders. */
const BLOCK_RENDERERS = new Map<string, (node: TipTapNode) => string>([
	['paragraph', (node) => renderInline(node.content)],
	[
		'heading',
		(node) =>
			`#heading(level: ${attrNumber(node.attrs, 'level') ?? 2})[${renderInline(node.content)}]`
	],
	['bulletList', (node) => `#list(${renderListItems(node)})`],
	['orderedList', (node) => `#enum(${renderListItems(node)})`],
	[
		'blockquote',
		(node) =>
			`#quote(block: true)[${childrenOf(node)
				.map((child) => renderBlock(child))
				.join('\n\n')}]`
	],
	['listItem', renderListItem]
]);

/** Render a single block-level node into a Typst snippet. */
function renderBlock(node: TipTapNode): string {
	const render = BLOCK_RENDERERS.get(node.type ?? '');
	// doc / unknown container — render children as blocks.
	return render ? render(node) : renderBlocks(childrenOf(node), '\n\n');
}

/** Serialize TipTap document JSON + metadata into a full Typst source string. */
export function paperToTypst(content: TipTapNode | null | undefined, meta: PaperTypstMeta): string {
	const body = renderBlocks(childrenOf(content ?? {}), '\n\n');

	const headerLines: string[] = [];
	if (meta.entityName) headerLines.push(`#strong[${escapeText(meta.entityName)}]`);
	if (meta.committeeLine) {
		headerLines.push(`${escapeText(meta.committeeLabel)}: ${escapeText(meta.committeeLine)}`);
	}
	if (meta.topic) {
		headerLines.push(`${escapeText(meta.topicLabel)}: ${escapeText(meta.topic)}`);
	}

	return `#set page(paper: "a4", margin: 2.5cm, numbering: "1")
#set par(justify: true, leading: 0.65em)
#set text(size: 11pt)
#set heading(numbering: none)
#set page(footer: [
  #set text(size: 8pt, fill: luma(40%))
  #align(center)[${escapeText(meta.disclaimer)}]
])

#align(center)[
  #text(size: 15pt, weight: "bold")[${escapeText(meta.conferenceName)}]
  #linebreak()
  #text(size: 11pt)[${escapeText(meta.paperType)}]
]

#v(6pt)
${headerLines.join(' #linebreak()\n')}
#v(4pt)
#line(length: 100%)
#v(8pt)

${body}
`;
}
