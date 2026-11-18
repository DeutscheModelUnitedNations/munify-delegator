/** A run of a paragraph: plain text, or a link's label and where it goes. */
export type InlinePart = { text: string; href?: string };

/** `[label](https://…)`: a Markdown inline link, http(s) only. */
const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/**
 * Splits a mail paragraph into plain text and links, so a text can say `[the manual]({manualLink})`
 * and the mail shows a link instead of a bare URL. Anything else, other schemes included, stays
 * text as it is written.
 */
export function inlineParts(paragraph: string): InlinePart[] {
	const parts: InlinePart[] = [];
	let last = 0;
	for (const match of paragraph.matchAll(LINK)) {
		const start = match.index ?? 0;
		if (start > last) parts.push({ text: paragraph.slice(last, start) });
		parts.push({ text: match[1] ?? '', href: match[2] });
		last = start + match[0].length;
	}
	if (last < paragraph.length) parts.push({ text: paragraph.slice(last) });
	return parts;
}
