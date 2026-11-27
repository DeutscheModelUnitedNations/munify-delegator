import { calloutColor } from './blocks';
import {
	discussionPointsOf,
	fileIdOf,
	type GuideDocument,
	type GuideMark,
	type GuideNode
} from './document';
import {
	escapeTypstString as escapeString,
	escapeTypstText as escapeText,
	typstFooter,
	typstLogoImage,
	typstPreamble,
	type TypstBrand,
	type TypstLogo
} from '#lib/helpers/typstTemplate';

/**
 * A guide page as Typst source (`docs/plans/guide.md`, "Committee text PDF"): the committee text
 * of an agenda item, rendered when its page is published, in the DMUN corporate design
 * (`#lib/helpers/typstTemplate`). Covers every block of the guide: images
 * come as files next to the source (`images`, by file id), callouts between two Akzentstreifen, toggles open,
 * buttons and embeds as links. Links to other guide pages and files read as plain text: a PDF
 * cannot open them.
 */

export type CommitteeTextHeader = {
	conference: string;
	committee: string;
	agendaItem: string;
	/** The conference logo next to the source, if there is one. */
	logo?: TypstLogo;
	/** "Thema": the label in front of the agenda item in the footer. */
	agendaItemLabel: string;
	brand: TypstBrand;
	/** Typst `lang` (`typstLang`). */
	lang: string;
};

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

/**
 * The Akzentstreifen colour of a callout: the brand accent, DMUN-Blau for warnings and errors
 * (the CD has no signal colours; on print DMUN-Blau doubles as the attention colour).
 */
function calloutStripe(color: ReturnType<typeof calloutColor>) {
	return color === 'warning' || color === 'error' ? 'dmun-blue' : 'dmun-accent';
}

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
	const stripe = `#dmun-stripe(color: ${calloutStripe(calloutColor(node.attrs?.color))}, length: 100%)`;
	// the icon is a Phosphor glyph, which the PDF has no font for: the stripes carry the callout
	const body = blocks({ nodes: node.content, images });
	return `#block(width: 100%, above: 16pt, below: 16pt)[${stripe}\n#v(2pt)\n${body}\n#v(2pt)\n${stripe}]`;
}

/**
 * The points for discussion: a tinted box with a DMUN-Blau rule on the left, a bold heading and the
 * numbered points (the PDF's attention colour, as warning callouts).
 */
function discussionPoints({ node }: { node: GuideNode }) {
	const { heading, points } = discussionPointsOf(node);
	if (points.length === 0) return '';
	const items = points.map((point) => `[${escapeText(point)}]`).join(', ');
	return `#block(width: 100%, above: 18pt, below: 18pt, fill: dmun-tint, stroke: (left: 4pt + dmun-blue), inset: (left: 14pt, right: 12pt, y: 12pt))[#text(size: 13pt, weight: "bold", fill: dmun-blue)[${escapeText(heading)}]\n\n#enum(${items})]`;
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
	horizontalRule: () => '#line(length: 100%, stroke: 0.75pt + black)',
	image,
	callout,
	discussionPoints,
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

/**
 * The head of the first page: the title on the dark background, with the white logo in it. A logo
 * without a white version (an uploaded one) sits above the block on white: it cannot be recoloured.
 */
function titleBlock(header: CommitteeTextHeader) {
	const { logo } = header;
	const onWhite = logo && !logo.darkPath ? `#${typstLogoImage({ logo })}\n#v(14pt)\n` : '';
	const inBlock = logo?.darkPath ? `#${typstLogoImage({ logo, dark: true })}\n  #v(10pt)\n  ` : '';
	return `${onWhite}#pad(x: -25mm, top: ${logo?.darkPath ? '-20mm' : '0mm'})[#block(fill: dmun-navy, width: 100%, inset: (x: 25mm, top: ${logo?.darkPath ? '10mm' : '14mm'}, bottom: 15mm))[
  #set text(fill: white)
  ${inBlock}#text(size: 15pt, weight: "bold")[${escapeText(header.committee)}]
  #v(12pt)
  #dmun-stripe(color: white)
  #block(above: 16pt)[#set par(leading: 0.15em)
    #text(size: 50pt, weight: "extralight")[${escapeText(header.agendaItem)}]]
]]
#v(18pt)`;
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
	const footer = [
		header.conference,
		header.committee,
		`${header.agendaItemLabel}: ${header.agendaItem}`
	]
		.map(escapeText)
		.join(' · ');
	return `${typstPreamble({ brand: header.brand, lang: header.lang })}
#set page(paper: "a4", margin: (x: 25mm, top: 20mm, bottom: 30mm), footer: ${typstFooter(footer)})

${titleBlock(header)}

${blocks({ nodes: doc.content, images })}
`;
}
