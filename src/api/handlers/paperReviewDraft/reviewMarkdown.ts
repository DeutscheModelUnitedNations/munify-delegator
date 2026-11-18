import { Lexer, type MarkedToken, type Token, type Tokens } from 'marked';
import type { JSONContent } from '@tiptap/core';

/**
 * Turns the Markdown an AI assistant writes a review draft in into the document the review editor
 * holds (`ReviewFormat.svelte`): paragraphs, `**bold**`, `*italic*`, bullet and numbered lists,
 * `##`/`###` headings, http(s) links and `> quotes`. Anything else becomes plain text.
 *
 * Quotes are taken literally: their text is not read as Markdown, since it is meant to be the
 * paper's own words (a `*` or `1.` in it would otherwise turn into formatting and the quote would
 * no longer be found). Each paragraph of a quote becomes a quote of its own, because "Find in
 * paper" (`BlockquoteWithFind`) looks for a quote's whole text inside one block of the paper.
 */

type Mark = NonNullable<JSONContent['marks']>[number];

const MARKED_TYPES: ReadonlySet<string> = new Set<MarkedToken['type']>([
	'blockquote',
	'br',
	'checkbox',
	'code',
	'codespan',
	'def',
	'del',
	'em',
	'escape',
	'heading',
	'hr',
	'html',
	'image',
	'link',
	'list',
	'list_item',
	'paragraph',
	'space',
	'strong',
	'table',
	'text'
]);

/** Whether a token is one of marked's own, not an extension's (the lexer runs without any). */
function isMarkedToken(token: Token): token is MarkedToken {
	return MARKED_TYPES.has(token.type);
}

/** A token's literal text, for the kinds that are kept as they stand. */
function literalText(token: MarkedToken) {
	return 'text' in token && typeof token.text === 'string' ? token.text : '';
}

/** Soft line breaks inside a paragraph read as spaces, as they would when rendered. */
function flatten(text: string) {
	return text.replace(/\s*\n\s*/g, ' ');
}

function textNode({ text, marks }: { text: string; marks: Mark[] }): JSONContent[] {
	if (!text) return [];
	return [marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text }];
}

function isWebLink(href: string) {
	return /^https?:\/\//i.test(href);
}

function inline(tokens: Token[] | undefined, marks: Mark[] = []): JSONContent[] {
	return (tokens ?? []).filter(isMarkedToken).flatMap((token): JSONContent[] => {
		switch (token.type) {
			case 'strong':
				return inline(token.tokens, [...marks, { type: 'bold' }]);
			case 'em':
				return inline(token.tokens, [...marks, { type: 'italic' }]);
			case 'link': {
				const linkMarks = isWebLink(token.href)
					? [...marks, { type: 'link', attrs: { href: token.href } }]
					: marks;
				return inline(token.tokens, linkMarks);
			}
			case 'br':
				return [{ type: 'hardBreak' }];
			case 'text':
				return token.tokens
					? inline(token.tokens, marks)
					: textNode({ text: flatten(token.text), marks });
			case 'del':
				return inline(token.tokens, marks);
			default:
				// codespan, escape, html and whatever else: the text as it stands
				return textNode({ text: flatten(literalText(token)), marks });
		}
	});
}

function paragraph(content: JSONContent[]): JSONContent {
	return content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' };
}

/** A quote's paragraphs, each as one literal quote. */
function quotes(token: Tokens.Blockquote): JSONContent[] {
	return token.text
		.split(/\n\s*\n/)
		.map((part) => flatten(part).trim())
		.filter(Boolean)
		.map((text) => ({
			type: 'blockquote',
			content: [paragraph(textNode({ text, marks: [] }))]
		}));
}

/** A list item starts with a paragraph in the editor (`ListItem`: `paragraph block*`). */
function listItem(item: Tokens.ListItem): JSONContent {
	const content = blocks(item.tokens);
	const first = content.at(0);
	return {
		type: 'listItem',
		content: first?.type === 'paragraph' ? content : [paragraph([]), ...content]
	};
}

function blocks(tokens: Token[]): JSONContent[] {
	return tokens.filter(isMarkedToken).flatMap((token): JSONContent[] => {
		switch (token.type) {
			case 'paragraph':
				return [paragraph(inline(token.tokens))];
			case 'text':
				// a tight list item's text
				return [
					paragraph(
						token.tokens ? inline(token.tokens) : textNode({ text: flatten(token.text), marks: [] })
					)
				];
			case 'heading': {
				const level = Math.min(3, Math.max(2, token.depth));
				const content = inline(token.tokens);
				return [{ type: 'heading', attrs: { level }, ...(content.length > 0 ? { content } : {}) }];
			}
			case 'list': {
				const items = token.items.map(listItem);
				if (!token.ordered) return [{ type: 'bulletList', content: items }];
				const start = typeof token.start === 'number' ? token.start : 1;
				return [{ type: 'orderedList', attrs: { start }, content: items }];
			}
			case 'blockquote':
				return quotes(token);
			case 'space':
			case 'hr':
				return [];
			default: {
				// code blocks, html, tables: their text as a paragraph
				const text = literalText(token).trim();
				return text ? [paragraph(textNode({ text, marks: [] }))] : [];
			}
		}
	});
}

/** The review editor's document for a Markdown text. */
export function markdownToReviewDocument(markdown: string): JSONContent {
	const content = blocks(new Lexer().lex(markdown.replace(/\r\n?/g, '\n')));
	return { type: 'doc', content: content.length > 0 ? content : [paragraph([])] };
}
