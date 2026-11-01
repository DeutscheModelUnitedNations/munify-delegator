/** What a link written by somebody else may lead to: web pages, mail and phone numbers. */
const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];
/** What an image written by somebody else may load: web addresses only. */
const IMAGE_PROTOCOLS = ['http:', 'https:'];

/** Resolves relative URLs (`/info`, `#top`) without them counting as another site. */
const RELATIVE_BASE = 'https://relative.invalid';

/**
 * `url` as given when it uses one of `protocols` (a relative one counts as the page's own), else
 * undefined. Parsed the way a browser parses an `href`, so `java\tscript:` and ` JavaScript:`
 * are caught as what they are.
 */
function withProtocol({ url, protocols }: { url: string; protocols: readonly string[] }) {
	const trimmed = url.trim();
	if (!trimmed) return undefined;
	let parsed: URL;
	try {
		parsed = new URL(trimmed, RELATIVE_BASE);
	} catch {
		return undefined;
	}
	return protocols.includes(parsed.protocol) ? trimmed : undefined;
}

/** A link target safe to render from content the team or a participant wrote; see `withProtocol`. */
export function safeLinkUrl(url: string) {
	return withProtocol({ url, protocols: LINK_PROTOCOLS });
}

/** An image source safe to render from content the team or a participant wrote. */
export function safeImageUrl(url: string) {
	return withProtocol({ url, protocols: IMAGE_PROTOCOLS });
}
