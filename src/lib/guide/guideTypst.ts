import { calloutColor } from './blocks';
import { fileIdOf, type GuideDocument, type GuideMark, type GuideNode } from './document';

/**
 * A guide page as Typst source (`docs/plans/guide.md`, "Committee text PDF"): the committee text
 * of an agenda item, rendered when its page is published. Covers every block of the guide: images
 * come as files next to the source (`images`, by file id), callouts as tinted boxes, toggles open,
 * buttons and embeds as links. Links to other guide pages and files read as plain text: a PDF
 * cannot open them.
 */

export type CommitteeTextHeader = {
	conference: string;
	committee: string;
	agendaItem: string;
	/** The emblem's file name next to the source, if there is one. */
	emblemPath?: string;
	/** "Gremium", "Thema", the footer: the labels in the conference's language. */
	committeeLabel: string;
	agendaItemLabel: string;
};

function escapeText(value: string) {
	return value.replace(/[\\#$*_`<>@~[\]=/+-]/g, (c) => `\\${c}`);
}

function escapeString(value: string) {
	return value.replace(/[\\"]/g, (c) => `\\${c}`);
}

function hrefOf(mark: GuideMark) {
	const href = mark.attrs?.href;
	return typeof href === 'string' ? href : '';
}

function applyMarks({ content, marks }: { content: string; marks: GuideMark[] | undefined }) {
	return (marks ?? []).reduce((out, mark) => {
		switch (mark.type) {
			case 'bold':
				return `#strong[${out}]`;
			case 'italic':
				return `#emph[${out}]`;
			case 'underline':
				return `#underline[${out}]`;
			case 'strike':
				return `#strike[${out}]`;
			case 'code':
				return `#raw("${escapeString(out)}")`;
			case 'link': {
				const href = hrefOf(mark);
				return /^(https?:|mailto:)/i.test(href) ? `#link("${escapeString(href)}")[${out}]` : out;
			}
			default:
				return out;
		}
	}, content);
}

function inline(nodes: readonly GuideNode[] | undefined): string {
	return (nodes ?? [])
		.map((node) => {
			if (node.type === 'hardBreak') return '#linebreak()';
			if (node.type === 'text') {
				const code = node.marks?.some((mark) => mark.type === 'code');
				return applyMarks({
					content: code ? (node.text ?? '') : escapeText(node.text ?? ''),
					marks: node.marks
				});
			}
			return inline(node.content);
		})
		.join('');
}

const CALLOUT_FILLS: Record<ReturnType<typeof calloutColor>, string> = {
	info: 'rgb("#e8f1fd")',
	success: 'rgb("#e7f6ec")',
	warning: 'rgb("#fdf4e3")',
	error: 'rgb("#fde8e8")',
	neutral: 'rgb("#f1f1f1")'
};

function blocks({
	nodes,
	images
}: {
	nodes: readonly GuideNode[] | undefined;
	images: Images;
}): string {
	return (nodes ?? [])
		.map((node) => block({ node, images }))
		.filter((text) => text.length > 0)
		.join('\n\n');
}

function listItems({ node, images }: { node: GuideNode; images: Images }) {
	return (node.content ?? [])
		.map((item) => `[${blocks({ nodes: item.content, images })}]`)
		.join(', ');
}

function attr(node: GuideNode, key: string) {
	const value = node.attrs?.[key];
	return typeof value === 'string' ? value : undefined;
}

type Images = ReadonlyMap<string, string>;

function image({ node, images }: { node: GuideNode; images: Images }) {
	const fileId = fileIdOf(node.attrs?.src);
	const path = fileId ? images.get(fileId) : undefined;
	if (!path) return '';
	const caption = attr(node, 'title') ?? attr(node, 'alt');
	const source = `image("${escapeString(path)}", width: 80%)`;
	return caption
		? `#figure(${source}, caption: [${escapeText(caption)}])`
		: `#align(center)[#${source}]`;
}

function callout({ node, images }: { node: GuideNode; images: Images }) {
	const fill = CALLOUT_FILLS[calloutColor(node.attrs?.color)];
	const emoji = attr(node, 'emoji');
	const body = blocks({ nodes: node.content, images });
	return `#block(fill: ${fill}, inset: 10pt, radius: 4pt, width: 100%)[${emoji ? `${escapeText(emoji)} ` : ''}${body}]`;
}

function button({ node }: { node: GuideNode }) {
	const href = attr(node, 'href') ?? '';
	const label = escapeText(attr(node, 'label') ?? href);
	return /^https?:/i.test(href) ? `#link("${escapeString(href)}")[→ ${label}]` : '';
}

function embed({ node }: { node: GuideNode }) {
	const url = attr(node, 'url') ?? '';
	return /^https?:/i.test(url) ? `#link("${escapeString(url)}")[${escapeText(url)}]` : '';
}

/** How each block renders; anything else shows its children. */
const BLOCKS: Record<string, (args: { node: GuideNode; images: Images }) => string> = {
	paragraph: ({ node }) => inline(node.content),
	heading: ({ node }) => {
		const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 2;
		return `#heading(level: ${Math.max(1, level - 1)})[${inline(node.content)}]`;
	},
	bulletList: ({ node, images }) => `#list(${listItems({ node, images })})`,
	orderedList: ({ node, images }) => `#enum(${listItems({ node, images })})`,
	blockquote: ({ node, images }) =>
		`#quote(block: true)[${blocks({ nodes: node.content, images })}]`,
	horizontalRule: () => '#line(length: 100%, stroke: 0.5pt + gray)',
	image,
	callout,
	toggle: ({ node, images }) =>
		`#strong[${escapeText(attr(node, 'summary') ?? '')}]\n\n${blocks({ nodes: node.content, images })}`,
	button,
	embed
};

function block({ node, images }: { node: GuideNode; images: Images }): string {
	const render = BLOCKS[node.type];
	return render ? render({ node, images }) : blocks({ nodes: node.content, images });
}

/** The image files a page needs next to its source, by file id. */
export function imageFileIdsOf(doc: GuideDocument) {
	const ids: string[] = [];
	const visit = (nodes: readonly GuideNode[] | undefined) => {
		for (const node of nodes ?? []) {
			if (node.type === 'image') {
				const id = fileIdOf(node.attrs?.src);
				if (id && !ids.includes(id)) ids.push(id);
			}
			visit(node.content);
		}
	};
	visit(doc.content);
	return ids;
}

/** The whole Typst source of a committee text. `images` maps file ids to their file names. */
export function committeeTextToTypst({
	doc,
	header,
	images
}: {
	doc: GuideDocument;
	header: CommitteeTextHeader;
	images: ReadonlyMap<string, string>;
}) {
	const emblem = header.emblemPath
		? `#align(center)[#image("${escapeString(header.emblemPath)}", height: 2.2cm)]\n`
		: '';
	return `#set page(paper: "a4", margin: 2.5cm, numbering: "1")
#set par(justify: true, leading: 0.65em)
#set text(lang: "de", size: 11pt)
#set heading(numbering: none)
${emblem}#align(center)[#text(size: 16pt, weight: "bold")[${escapeText(header.conference)}]]
#align(center)[${escapeText(header.committeeLabel)}: ${escapeText(header.committee)}]
#align(center)[#text(size: 14pt, weight: "bold")[${escapeText(header.agendaItemLabel)}: ${escapeText(header.agendaItem)}]]
#v(1em)

${blocks({ nodes: doc.content, images })}
`;
}
