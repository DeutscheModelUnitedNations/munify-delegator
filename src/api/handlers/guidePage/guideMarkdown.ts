import { Lexer, type Token, type Tokens } from 'marked';
import {
	flatten,
	headingOf,
	listItemOf,
	listOf,
	literalText,
	markedTokens,
	textRun
} from '#api/services/markdownTokens';
import {
	RICH_BLOCKS,
	isSafeHref,
	type GuideDocument,
	type GuideMark,
	type GuideNode
} from '#lib/guide/document';

/**
 * Markdown and guide pages, both ways, for AI assistants (`docs/plans/guide.md`, "MCP"). Plain
 * Markdown covers headings (`##`–`####`), paragraphs, **bold**, *italic*, ~~strike~~, `code`,
 * lists, quotes, rules and links; the guide's references are links too: `[text](guide:<pageId>)`
 * to another page, `[label](file:<fileId>)` to a download and `![caption](file:<fileId>)` for an
 * image. Placeholders (`{{Gremium}}`) are plain text. Callouts, toggles, buttons and embeds have no
 * Markdown: reading a page as Markdown leaves them out and says so.
 */

function textNode({ text, marks }: { text: string; marks: GuideMark[] }): GuideNode[] {
	return textRun({ text, marks });
}

/** The marks the emphasis tokens stand for. */
const EMPHASIS: Record<string, GuideMark['type']> = { strong: 'bold', em: 'italic', del: 'strike' };

function inline(tokens: Token[] | undefined, marks: GuideMark[] = []): GuideNode[] {
	return markedTokens(tokens).flatMap((token): GuideNode[] => {
		const emphasis = EMPHASIS[token.type];
		if (emphasis && 'tokens' in token) return inline(token.tokens, [...marks, { type: emphasis }]);
		switch (token.type) {
			case 'codespan':
				return textNode({ text: token.text, marks: [...marks, { type: 'code' }] });
			case 'link':
				return inline(
					token.tokens,
					isSafeHref(token.href) ? [...marks, { type: 'link', attrs: { href: token.href } }] : marks
				);
			case 'br':
				return [{ type: 'hardBreak' }];
			case 'image':
				// lifted out of its paragraph by `paragraphBlocks`
				return [{ type: 'image', attrs: { src: token.href, alt: token.text || null } }];
			case 'text':
				if (token.tokens) return inline(token.tokens, marks);
				return textNode({ text: flatten(token.text), marks });
			default:
				return textNode({ text: flatten(literalText(token)), marks });
		}
	});
}

/** A paragraph, with its images as blocks of their own (TipTap's image is a block). */
function paragraphBlocks(content: GuideNode[]): GuideNode[] {
	const result: GuideNode[] = [];
	let run: GuideNode[] = [];
	const flush = () => {
		const trimmed = run.filter((node, index) => !(node.type === 'hardBreak' && index === 0));
		if (trimmed.some((node) => node.type !== 'hardBreak' && (node.text ?? '').trim() !== '')) {
			result.push({ type: 'paragraph', content: trimmed });
		}
		run = [];
	};
	for (const node of content) {
		if (node.type === 'image') {
			flush();
			if (isSafeHref(node.attrs?.src)) result.push(node);
		} else run.push(node);
	}
	flush();
	return result.length > 0 || content.length > 0 ? result : [{ type: 'paragraph' }];
}

function listItem(item: Tokens.ListItem): GuideNode {
	return listItemOf({ content: blocks(item.tokens), empty: { type: 'paragraph' } });
}

function blocks(tokens: Token[]): GuideNode[] {
	return markedTokens(tokens).flatMap((token): GuideNode[] => {
		switch (token.type) {
			case 'paragraph':
				return paragraphBlocks(inline(token.tokens));
			case 'text':
				return paragraphBlocks(
					token.tokens ? inline(token.tokens) : textNode({ text: flatten(token.text), marks: [] })
				);
			case 'heading':
				return [
					headingOf({
						depth: token.depth,
						content: inline(token.tokens).filter((node) => node.type !== 'image'),
						maxLevel: 4
					})
				];
			case 'list':
				return [
					listOf({ items: token.items.map(listItem), ordered: token.ordered, start: token.start })
				];
			case 'blockquote': {
				const content = blocks(token.tokens);
				return content.length > 0 ? [{ type: 'blockquote', content }] : [];
			}
			case 'hr':
				return [{ type: 'horizontalRule' }];
			case 'space':
				return [];
			default: {
				const text = literalText(token).trim();
				return text ? [{ type: 'paragraph', content: textNode({ text, marks: [] }) }] : [];
			}
		}
	});
}

/** The guide document for a Markdown text. */
export function markdownToGuideDocument(markdown: string): GuideDocument {
	const content = blocks(new Lexer().lex(markdown.replace(/\r\n?/g, '\n')));
	return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

// --- Guide document to Markdown ---------------------------------------------------------------

/** Escapes what Markdown would read as formatting. */
function escapeText(text: string) {
	return text.replace(/([\\`*_[\]~])/g, '\\$1');
}

function hrefOf(mark: GuideMark | undefined) {
	const href = mark?.attrs?.href;
	return typeof href === 'string' ? href : '';
}

function inlineMarkdown(nodes: readonly GuideNode[] | undefined): string {
	return (nodes ?? [])
		.map((node) => {
			if (node.type === 'hardBreak') return '  \n';
			if (node.type !== 'text') return '';
			const marks = node.marks ?? [];
			let text = marks.some((mark) => mark.type === 'code')
				? `\`${node.text ?? ''}\``
				: escapeText(node.text ?? '');
			if (marks.some((mark) => mark.type === 'bold')) text = `**${text}**`;
			if (marks.some((mark) => mark.type === 'italic')) text = `*${text}*`;
			if (marks.some((mark) => mark.type === 'strike')) text = `~~${text}~~`;
			const link = marks.find((mark) => mark.type === 'link');
			if (link) text = `[${text}](${hrefOf(link)})`;
			return text;
		})
		.join('');
}

function indent(text: string, prefix: string) {
	return text
		.split('\n')
		.map((line, index) =>
			index === 0 ? line : line ? `${' '.repeat(prefix.length)}${line}` : line
		)
		.join('\n');
}

function listMarkdown({ node, omitted }: { node: GuideNode; omitted: Set<string> }) {
	const start = typeof node.attrs?.start === 'number' ? node.attrs.start : 1;
	return (node.content ?? [])
		.map((item, index) => {
			const prefix = node.type === 'bulletList' ? '- ' : `${start + index}. `;
			return prefix + indent(blocksMarkdown(item.content, omitted), prefix);
		})
		.join('\n');
}

function attrText(node: GuideNode, key: string) {
	const value = node.attrs?.[key];
	return typeof value === 'string' ? value : '';
}

/** How each block reads in Markdown; the rich blocks have no Markdown and are left out. */
const BLOCK_MARKDOWN: Record<string, (args: { node: GuideNode; omitted: Set<string> }) => string> =
	{
		paragraph: ({ node }) => inlineMarkdown(node.content),
		heading: ({ node }) =>
			`${'#'.repeat(typeof node.attrs?.level === 'number' ? node.attrs.level : 2)} ${inlineMarkdown(node.content)}`,
		bulletList: listMarkdown,
		orderedList: listMarkdown,
		blockquote: ({ node, omitted }) =>
			blocksMarkdown(node.content, omitted)
				.split('\n')
				.map((line) => (line ? `> ${line}` : '>'))
				.join('\n'),
		horizontalRule: () => '---',
		image: ({ node }) => `![${escapeText(attrText(node, 'alt'))}](${attrText(node, 'src')})`
	};

function blockMarkdown(node: GuideNode, omitted: Set<string>): string {
	const write = BLOCK_MARKDOWN[node.type];
	if (write) return write({ node, omitted });
	if ((RICH_BLOCKS as readonly string[]).includes(node.type)) omitted.add(node.type);
	return '';
}

function blocksMarkdown(nodes: readonly GuideNode[] | undefined, omitted: Set<string>) {
	return (nodes ?? [])
		.map((node) => blockMarkdown(node, omitted))
		.filter((text) => text !== '')
		.join('\n\n');
}

/**
 * The page as Markdown, and the rich blocks that were left out (`RICH_BLOCKS`, each once): read
 * the page as TipTap JSON to see them.
 */
export function guideDocumentToMarkdown(doc: GuideDocument) {
	const omitted = new Set<string>();
	const markdown = blocksMarkdown(doc.content, omitted);
	return { markdown, omittedBlocks: [...omitted] };
}
