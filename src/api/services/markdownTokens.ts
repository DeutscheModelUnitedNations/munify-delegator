import type { MarkedToken, Token } from 'marked';

/**
 * What the Markdown converters for assistants share (`reviewMarkdown.ts` for review drafts,
 * `guideMarkdown.ts` for guide pages): telling marked's own tokens apart and reading their text.
 */

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

/** marked's own tokens of a list (none for no list). */
export function markedTokens(tokens: readonly Token[] | undefined): MarkedToken[] {
	return (tokens ?? []).filter(isMarkedToken);
}

/** A token's literal text, for the kinds that are kept as they stand. */
export function literalText(token: MarkedToken) {
	return 'text' in token && typeof token.text === 'string' ? token.text : '';
}

/** Soft line breaks inside a paragraph read as spaces, as they would when rendered. */
export function flatten(text: string) {
	return text.replace(/\s*\n\s*/g, ' ');
}

/** A text node with its marks; nothing for no text. */
export function textRun<M>({ text, marks }: { text: string; marks: M[] }) {
	if (!text) return [];
	return [marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text }];
}

/** A list item starts with a paragraph in the editors (`paragraph block*`): `empty` when not. */
export function listItemOf<N extends { type?: string }>({
	content,
	empty
}: {
	content: N[];
	empty: N;
}) {
	return {
		type: 'listItem',
		content: content.at(0)?.type === 'paragraph' ? content : [empty, ...content]
	};
}

/** A heading of `depth`, clamped to the levels an editor offers (from 2 up to `maxLevel`). */
export function headingOf<N>({
	depth,
	content,
	maxLevel
}: {
	depth: number;
	content: N[];
	maxLevel: number;
}) {
	const level = Math.min(maxLevel, Math.max(2, depth));
	return { type: 'heading', attrs: { level }, ...(content.length > 0 ? { content } : {}) };
}

/** A bullet list, or a numbered one keeping its start. */
export function listOf<N>({
	items,
	ordered,
	start
}: {
	items: N[];
	ordered: boolean;
	start: unknown;
}) {
	if (!ordered) return { type: 'bulletList', content: items };
	return {
		type: 'orderedList',
		attrs: { start: typeof start === 'number' ? start : 1 },
		content: items
	};
}
