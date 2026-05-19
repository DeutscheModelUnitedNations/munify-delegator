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

/** Render an array of inline nodes (text + hardBreak) into Typst content. */
function renderInline(nodes: TipTapNode[] | undefined): string {
	if (!nodes) return '';
	return nodes
		.map((node) => {
			if (node.type === 'hardBreak') return '#linebreak()';
			if (node.type === 'text' || typeof node.text === 'string') {
				let out = escapeText(node.text ?? '');
				for (const mark of node.marks ?? []) {
					switch (mark.type) {
						case 'bold':
							out = `#strong[${out}]`;
							break;
						case 'italic':
							out = `#emph[${out}]`;
							break;
						case 'underline':
							out = `#underline[${out}]`;
							break;
						case 'superscript':
							out = `#super[${out}]`;
							break;
						case 'subscript':
							out = `#sub[${out}]`;
							break;
						case 'link': {
							const href = attrString(mark.attrs, 'href') ?? '';
							out = `#link("${escapeString(href)}")[${out}]`;
							break;
						}
						default:
							break;
					}
				}
				return out;
			}
			// Unexpected inline child — fall back to its own inline content.
			return renderInline(node.content);
		})
		.join('');
}

/** Render the inline content of a list item (its block children, flattened). */
function renderListItem(item: TipTapNode): string {
	return (item.content ?? [])
		.map((child) => renderBlock(child))
		.filter((s) => s.length > 0)
		.join('\n');
}

/** Render a single block-level node into a Typst snippet. */
function renderBlock(node: TipTapNode): string {
	switch (node.type) {
		case 'paragraph':
			return renderInline(node.content);
		case 'heading': {
			const level = attrNumber(node.attrs, 'level') ?? 2;
			return `#heading(level: ${level})[${renderInline(node.content)}]`;
		}
		case 'bulletList':
			return `#list(${(node.content ?? []).map((li) => `[${renderListItem(li)}]`).join(', ')})`;
		case 'orderedList':
			return `#enum(${(node.content ?? []).map((li) => `[${renderListItem(li)}]`).join(', ')})`;
		case 'blockquote':
			return `#quote(block: true)[${(node.content ?? [])
				.map((child) => renderBlock(child))
				.join('\n\n')}]`;
		case 'listItem':
			return renderListItem(node);
		default:
			// doc / unknown container — render children as blocks.
			return (node.content ?? [])
				.map((child) => renderBlock(child))
				.filter((s) => s.length > 0)
				.join('\n\n');
	}
}

/** Serialize TipTap document JSON + metadata into a full Typst source string. */
export function paperToTypst(content: TipTapNode | null | undefined, meta: PaperTypstMeta): string {
	const doc: TipTapNode = content ?? {};
	const body = (doc.content ?? [])
		.map((child) => renderBlock(child))
		.filter((s) => s.length > 0)
		.join('\n\n');

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
