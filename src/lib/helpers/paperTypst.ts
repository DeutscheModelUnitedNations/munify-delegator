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
 * The page follows the DMUN corporate design (`./typstTemplate`). The only side file is the
 * conference logo (`branding.logoPath`), which the server writes next to the source; without it
 * (the client-side `.typ` download) the document is self-contained.
 */

import {
	escapeTypstString as escapeString,
	escapeTypstText as escapeText,
	typstFactBox,
	typstFooter,
	typstPreamble,
	type TypstBrand
} from './typstTemplate';

export interface TipTapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

export interface TipTapNode {
	type?: string;
	content?: TipTapNode[];
	text?: string;
	marks?: TipTapMark[];
	attrs?: Record<string, unknown>;
}

export interface PaperTypstMeta {
	/** Already-translated paper type label, the page's title. */
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
	/** Shown top right under the conference name, e.g. "PP-2026-A3F9C1". */
	documentNumber?: string;
}

/** What the conference decides about the page: its name, brand, language and logo. */
export interface PaperTypstBranding {
	/** Conference display name (top right, running header). */
	conferenceName: string;
	brand: TypstBrand;
	/** Typst `lang` (`typstLang`). */
	lang: string;
	/** The logo's file name next to the source, if there is one. */
	logoPath?: string;
}

function attrString({
	attrs,
	key
}: {
	attrs: Record<string, unknown> | undefined;
	key: string;
}): string | undefined {
	const v = attrs?.[key];
	return typeof v === 'string' ? v : undefined;
}

function attrNumber({
	attrs,
	key
}: {
	attrs: Record<string, unknown> | undefined;
	key: string;
}): number | undefined {
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
		(content, mark) =>
			`#link("${escapeString(attrString({ attrs: mark.attrs, key: 'href' }) ?? '')}")[${content}]`
	]
]);

/** Wraps the content in its marks, in order; unknown marks are left out. */
function applyMarks({
	content,
	marks
}: {
	content: string;
	marks: TipTapMark[] | undefined;
}): string {
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
	return applyMarks({ content: escapeText(node.text ?? ''), marks: node.marks });
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
function renderBlocks({ nodes, separator }: { nodes: TipTapNode[]; separator: string }): string {
	return nodes
		.map((child) => renderBlock(child))
		.filter((s) => s.length > 0)
		.join(separator);
}

/** Render the inline content of a list item (its block children, flattened). */
function renderListItem(item: TipTapNode): string {
	return renderBlocks({ nodes: childrenOf(item), separator: '\n' });
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
			`#heading(level: ${Math.max(1, (attrNumber({ attrs: node.attrs, key: 'level' }) ?? 2) - 1)})[${renderInline(node.content)}]`
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
	return render ? render(node) : renderBlocks({ nodes: childrenOf(node), separator: '\n\n' });
}

/** The first page's head: logo and conference left/right, the stripe, title, delegation, facts. */
function titleBlock({ meta, branding }: { meta: PaperTypstMeta; branding: PaperTypstBranding }) {
	const logo = branding.logoPath
		? `image("${escapeString(branding.logoPath)}", height: 1.3cm)`
		: '[]';
	const corner = [`#strong[${escapeText(branding.conferenceName)}]`];
	if (meta.documentNumber) corner.push(escapeText(meta.documentNumber));
	const facts: { label: string; value: string }[] = [];
	if (meta.committeeLine) facts.push({ label: meta.committeeLabel, value: meta.committeeLine });
	if (meta.topic) facts.push({ label: meta.topicLabel, value: meta.topic });
	const entity = meta.entityName
		? `#block(above: 24pt, below: 0pt)[#text(size: 15pt, weight: "bold")[${escapeText(meta.entityName)}]]\n`
		: '';
	return `#grid(columns: (1fr, auto), align(left + horizon, ${logo}), align(right + horizon, text(size: 9pt)[${corner.join(' #linebreak() ')}]))
#v(30pt)
#dmun-stripe()
#block(above: 20pt, below: 0pt)[#set par(leading: 0.15em)
  #text(size: 50pt, weight: "extralight")[${escapeText(meta.paperType)}]]
${entity}#v(20pt)
${typstFactBox(facts)}
#v(10pt)`;
}

/** The running header of every page but the first: who, what, where. */
function runningHeader({ meta, branding }: { meta: PaperTypstMeta; branding: PaperTypstBranding }) {
	const parts = [
		meta.entityName ? `#strong[${escapeText(meta.entityName)}]` : '',
		escapeText(meta.paperType)
	];
	if (meta.committeeLine) parts.push(escapeText(meta.committeeLine));
	const left = parts.filter((part) => part.length > 0).join(' · ');
	return `locate(loc => if counter(page).at(loc).first() > 1 [
  #set text(size: 9pt)
  #grid(columns: (1fr, auto), column-gutter: 24pt, [${left}], [${escapeText(branding.conferenceName)}])
  #v(-4pt)
  #line(length: 100%, stroke: 0.75pt + black)
])`;
}

/** Serialize TipTap document JSON + metadata into a full Typst source string. */
export function paperToTypst({
	content,
	meta,
	branding
}: {
	content: TipTapNode | null | undefined;
	meta: PaperTypstMeta;
	branding: PaperTypstBranding;
}): string {
	const body = renderBlocks({ nodes: childrenOf(content ?? {}), separator: '\n\n' });

	return `${typstPreamble({ brand: branding.brand, lang: branding.lang })}
#set page(paper: "a4", margin: (x: 25mm, top: 22mm, bottom: 30mm),
  header: ${runningHeader({ meta, branding })},
  footer: ${typstFooter(escapeText(meta.disclaimer))})

${titleBlock({ meta, branding })}

${body}
`;
}
