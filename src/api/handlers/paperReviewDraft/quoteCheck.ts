/**
 * Which quotes of a review would not be found in the paper. Mirrors "Find in paper"
 * (`BlockquoteWithFind`, `#lib/helpers/citeNavigation`): a quote's text is all of its text run
 * together, whitespace collapsed, and it is found when it stands inside one block of the paper (a
 * paragraph, heading, list item or clause), whitespace collapsed too.
 */

function normalize(text: string) {
	return text.replace(/\s+/g, ' ').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function childrenOf(node: Record<string, unknown>): unknown[] {
	return Array.isArray(node.content) ? node.content : [];
}

/** All text of a TipTap node, run together as the browser's `textContent` would. */
function nodeText(node: unknown): string {
	if (!isRecord(node)) return '';
	if (node.type === 'text') return typeof node.text === 'string' ? node.text : '';
	return childrenOf(node).map(nodeText).join('');
}

/** The texts of a review's quotes, in order, empty ones left out. */
export function quotesOf(document: unknown): string[] {
	if (!isRecord(document)) return [];
	if (document.type === 'blockquote') {
		const text = normalize(nodeText(document));
		return text ? [text] : [];
	}
	return childrenOf(document).flatMap(quotesOf);
}

const TEXT_BLOCKS = new Set(['paragraph', 'heading', 'listItem']);

/** The texts of a TipTap paper's blocks, as the finder searches them. */
function tiptapBlocks(node: unknown): string[] {
	if (!isRecord(node)) return [];
	const own = TEXT_BLOCKS.has(String(node.type)) ? [nodeText(node)] : [];
	return [...own, ...childrenOf(node).flatMap(tiptapBlocks)];
}

/** The texts inside a clause, in order: every `content` string, not ids or block types. */
function clauseTexts(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(clauseTexts);
	if (!isRecord(value)) return [];
	return Object.entries(value).flatMap(([key, inner]) =>
		key === 'content' && typeof inner === 'string' ? [inner] : clauseTexts(inner)
	);
}

/**
 * The texts of a resolution's clauses (its current and its legacy shape): each text on its own,
 * and each clause or sub-clause with everything in it, as the clause's element holds it.
 */
function resolutionBlocks(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(resolutionBlocks);
	if (!isRecord(value)) return [];
	const own = typeof value.content === 'string' ? [value.content] : [];
	const whole = clauseTexts(value);
	const nested = Object.entries(value)
		.filter(([key]) => key !== 'content')
		.flatMap(([, inner]) => resolutionBlocks(inner));
	return [...own, whole.join(''), whole.join(' '), ...nested];
}

function isResolution(content: Record<string, unknown>) {
	return Array.isArray(content.preamble) && Array.isArray(content.operative);
}

/** A document as stored, or as a JSON string, which older rows hold. */
function parsed(content: unknown): unknown {
	if (typeof content !== 'string') return content;
	try {
		return JSON.parse(content);
	} catch {
		return undefined;
	}
}

/** The texts the finder searches in a paper version's content, whitespace collapsed. */
export function paperBlocks(stored: unknown): string[] {
	const content = parsed(stored);
	if (!isRecord(content)) return [];
	const blocks = isResolution(content)
		? resolutionBlocks([content.preamble, content.operative])
		: tiptapBlocks(content);
	return blocks.map(normalize).filter(Boolean);
}

/** The quotes of a review that stand in no block of the paper. */
export function unmatchedQuotes({
	review,
	paperContent
}: {
	review: unknown;
	paperContent: unknown;
}): string[] {
	const blocks = paperBlocks(paperContent);
	return quotesOf(review).filter((quote) => !blocks.some((block) => block.includes(quote)));
}
