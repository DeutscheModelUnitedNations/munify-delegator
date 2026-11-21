import { getContext, setContext } from 'svelte';

/**
 * Where a link to another guide page leads, for the node components of `GuideContent`: set once
 * by `GuideContent`, read by the text and button nodes, so the other nodes need not pass it on.
 */
const KEY = Symbol('guide-page-href');

export type PageHref = (pageId: string) => string;

export function setPageHref(pageHref: () => PageHref) {
	setContext(KEY, pageHref);
}

/** The `pageHref` of the enclosing `GuideContent`; `#` outside one. */
export function pageHrefOf(): PageHref {
	const read = getContext<(() => PageHref) | undefined>(KEY);
	return read ? read() : () => '#';
}
