import { pageIdOf } from './document';

/**
 * Where a link of a page the reader got takes them: a guide page through `pageHref`, the web, a
 * mail or a file URL as it is; undefined for anything else.
 */
export function readerHref({
	href,
	pageHref
}: {
	href: unknown;
	pageHref: (pageId: string) => string;
}) {
	const pageId = pageIdOf(href);
	if (pageId) return pageHref(pageId);
	return typeof href === 'string' && /^(https?:|mailto:|\/)/i.test(href) ? href : undefined;
}

/** Whether a link leaves the app (and opens in a new tab). */
export const isExternal = (href: string | undefined) => !!href && /^https?:/i.test(href);
