import { Mark, Node, mergeAttributes, type Extensions } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import HardBreak from '@tiptap/extension-hard-break';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import Link from '@tiptap/extension-link';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import { Dropcursor, Gapcursor, Placeholder, UndoRedo } from '@tiptap/extensions';
import { calloutColor, calloutIcon, DEFAULT_CALLOUT_ICON } from '#lib/guide/blocks';

/**
 * The TipTap set of the guide editor (`docs/plans/guide.md`, "Editor and blocks"): the node and
 * mark names are those of `GUIDE_NODES` / `GUIDE_MARKS` (`#lib/guide/document`), which the API
 * checks and `GuideContent.svelte` renders for readers. The editor only shows the blocks; how a
 * reader sees them is the renderer's business.
 */

const Strike = Mark.create({
	name: 'strike',
	parseHTML: () => [{ tag: 's' }, { tag: 'del' }],
	renderHTML: ({ HTMLAttributes }) => ['s', HTMLAttributes, 0]
});

const Code = Mark.create({
	name: 'code',
	excludes: '_',
	parseHTML: () => [{ tag: 'code' }],
	renderHTML: ({ HTMLAttributes }) => ['code', HTMLAttributes, 0]
});

const HorizontalRule = Node.create({
	name: 'horizontalRule',
	group: 'block',
	parseHTML: () => [{ tag: 'hr' }],
	renderHTML: ({ HTMLAttributes }) => ['hr', HTMLAttributes]
});

const stringAttr = (value: unknown) => (typeof value === 'string' ? value : '');

/** An image's source, alt text and caption, as text. */
function imageAttrs(attrs: Record<string, unknown>) {
	return { src: stringAttr(attrs.src), alt: stringAttr(attrs.alt), title: stringAttr(attrs.title) };
}

/** An image from the guide's files (`src: "file:<id>"`); `resolveSrc` shows it in the editor. */
const GuideImage = Node.create<{ resolveSrc: (src: string) => string | undefined }>({
	name: 'image',
	group: 'block',
	draggable: true,
	addOptions: () => ({ resolveSrc: (src: string) => src }),
	addAttributes: () => ({
		src: { default: null },
		alt: { default: null },
		title: { default: null }
	}),
	parseHTML: () => [{ tag: 'figure[data-guide-image]' }],
	renderHTML({ node, HTMLAttributes }) {
		const { src, alt, title } = imageAttrs(node.attrs);
		return [
			'figure',
			mergeAttributes(HTMLAttributes, { 'data-guide-image': '', class: 'guide-image' }),
			['img', { src: this.options.resolveSrc(src) ?? '', alt }],
			['figcaption', {}, title || alt]
		];
	}
});

/** A tinted box with a Phosphor icon, holding blocks. */
const Callout = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,
	addAttributes: () => ({
		icon: { default: DEFAULT_CALLOUT_ICON },
		color: { default: 'info' }
	}),
	parseHTML: () => [{ tag: 'div[data-guide-callout]', contentElement: '.guide-callout-body' }],
	renderHTML({ node, HTMLAttributes }) {
		const color = calloutColor(node.attrs.color);
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-guide-callout': '',
				'data-icon': calloutIcon(node.attrs.icon),
				class: `guide-callout guide-callout-${color}`
			}),
			[
				'i',
				{
					class: `guide-callout-icon ph-duotone ph-${calloutIcon(node.attrs.icon)}`,
					contenteditable: 'false',
					'aria-hidden': 'true'
				}
			],
			['div', { class: 'guide-callout-body' }, 0]
		];
	}
});

/** A collapsible block: readers open it; in the editor it stays open, its summary above it. */
const Toggle = Node.create({
	name: 'toggle',
	group: 'block',
	content: 'block+',
	defining: true,
	addAttributes: () => ({ summary: { default: '' } }),
	parseHTML: () => [{ tag: 'div[data-guide-toggle]' }],
	renderHTML({ node, HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-guide-toggle': '',
				class: 'guide-toggle',
				'data-summary': node.attrs.summary ?? ''
			}),
			0
		];
	}
});

/** A button linking to a page, a file or the web. */
const Button = Node.create({
	name: 'button',
	group: 'block',
	atom: true,
	addAttributes: () => ({ href: { default: '' }, label: { default: '' } }),
	parseHTML: () => [{ tag: 'div[data-guide-button]' }],
	renderHTML({ node, HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-guide-button': '', class: 'guide-button' }),
			['span', { class: 'btn btn-primary btn-sm pointer-events-none' }, node.attrs.label || '…'],
			['span', { class: 'text-xs opacity-60 ms-2' }, node.attrs.href ?? '']
		];
	}
});

/** A video (YouTube) readers load with a click. */
const Embed = Node.create({
	name: 'embed',
	group: 'block',
	atom: true,
	addAttributes: () => ({ url: { default: '' } }),
	parseHTML: () => [{ tag: 'div[data-guide-embed]' }],
	renderHTML({ node, HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-guide-embed': '', class: 'guide-embed' }),
			['i', { class: 'ph-duotone ph-youtube-logo text-2xl', 'aria-hidden': 'true' }],
			['span', {}, node.attrs.url ?? '']
		];
	}
});

/** The guide editor's extensions. */
export function guideExtensions({
	placeholder,
	resolveSrc
}: {
	placeholder: string;
	resolveSrc: (src: string) => string | undefined;
}): Extensions {
	return [
		Document,
		Paragraph,
		Text,
		Bold,
		Italic,
		Underline,
		Strike,
		Code,
		HardBreak,
		Heading.configure({ levels: [2, 3, 4] }),
		Blockquote,
		BulletList,
		OrderedList,
		ListItem,
		HorizontalRule,
		Link.configure({
			openOnClick: false,
			autolink: true,
			protocols: ['guide', 'file', 'mailto'],
			isAllowedUri: (url) => /^(https?:|mailto:|guide:|file:)/i.test(url)
		}),
		GuideImage.configure({ resolveSrc }),
		Callout,
		Toggle,
		Button,
		Embed,
		Dropcursor,
		Gapcursor,
		UndoRedo,
		Placeholder.configure({ placeholder })
	];
}
