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

function textNode({ text, marks }: { text: string; marks: Mark[] }): JSONContent[] {
	return textRun({ text, marks });
}

function isWebLink(href: string) {
	return /^https?:\/\//i.test(href);
}

function inline(tokens: Token[] | undefined, marks: Mark[] = []): JSONContent[] {
	return markedTokens(tokens).flatMap((token): JSONContent[] => {
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
	return listItemOf({ content: blocks(item.tokens), empty: paragraph([]) });
}

function blocks(tokens: Token[]): JSONContent[] {
	return markedTokens(tokens).flatMap((token): JSONContent[] => {
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
			case 'heading':
				return [headingOf({ depth: token.depth, content: inline(token.tokens), maxLevel: 3 })];
			case 'list':
				return [
					listOf({ items: token.items.map(listItem), ordered: token.ordered, start: token.start })
				];
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
