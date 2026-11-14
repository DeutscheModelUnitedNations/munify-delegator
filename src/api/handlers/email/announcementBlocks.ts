import { Lexer, type Token, type Tokens } from 'marked';

/**
 * An announcement's Markdown as the mail draws it: headings, paragraphs and lists of plain text,
 * with `[label](url)` links kept (`inlineParts` turns them into links). Nothing of the Markdown
 * reaches the mail as HTML.
 */
export type MailBlock =
	| { type: 'heading'; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'list'; ordered: boolean; items: string[] };

const isLink = (token: Token): token is Tokens.Link => token.type === 'link';
const isHttp = (href: string) => /^https?:\/\//.test(href);

/** The text of inline tokens: emphasis dropped, http(s) links kept as Markdown links. */
function inlineText(tokens: readonly Token[] | undefined): string {
	return (tokens ?? [])
		.map((token): string => {
			if (isLink(token)) {
				const label = inlineText(token.tokens) || token.href;
				return isHttp(token.href) ? `[${label}](${token.href})` : label;
			}
			if (token.type === 'image') return token.text;
			if (token.type === 'br') return '\n';
			if (token.type === 'codespan' || token.type === 'escape') return token.text;
			if (token.type === 'html') return '';
			if ('tokens' in token && token.tokens) return inlineText(token.tokens);
			return 'text' in token ? token.text : token.raw;
		})
		.join('');
}

/** A list item's text; what is nested in it follows on its own lines. */
function itemText(item: Tokens.ListItem) {
	return item.tokens
		.map((token) =>
			token.type === 'list'
				? token.items.map((nested: Tokens.ListItem) => `– ${itemText(nested)}`).join('\n')
				: inlineText('tokens' in token && token.tokens ? token.tokens : [token])
		)
		.filter(Boolean)
		.join('\n');
}

function blocksOf(tokens: readonly Token[]): MailBlock[] {
	return tokens.flatMap((token): MailBlock[] => {
		switch (token.type) {
			case 'heading':
				return [{ type: 'heading', text: inlineText(token.tokens) }];
			case 'paragraph':
				return [{ type: 'paragraph', text: inlineText(token.tokens) }];
			case 'text':
				return [{ type: 'paragraph', text: inlineText(token.tokens ?? [token]) }];
			case 'list':
				return [
					{
						type: 'list',
						ordered: !!token.ordered,
						items: token.items.map((item: Tokens.ListItem) => itemText(item))
					}
				];
			case 'blockquote':
				return blocksOf(token.tokens ?? []);
			case 'code':
				return [{ type: 'paragraph', text: token.text }];
			case 'table':
				return [];
			default:
				return [];
		}
	});
}

/** The blocks of an announcement's text, empty ones left out. */
export function announcementBlocks(markdown: string): MailBlock[] {
	return blocksOf(new Lexer().lex(markdown)).filter((block) =>
		block.type === 'list' ? block.items.length > 0 : block.text.trim() !== ''
	);
}
