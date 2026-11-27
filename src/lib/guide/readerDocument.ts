import {
	fileIdOf,
	headingsOf,
	headingTextOf,
	mapNodes,
	pageIdOf,
	type GuideDocument,
	type GuideMark,
	type GuideNode
} from './document';

/**
 * A page's text as one reader gets it (`guideReaderPage`): file references as download URLs, links
 * to pages outside their guide as plain text, headings with the anchors of the table of contents.
 */

export type HrefResolver = (href: unknown) => string | undefined;

/** Resolves `file:` to a URL from `urls`, keeps `guide:` only for pages in the guide. */
export function hrefResolver({
	urls,
	inGuide
}: {
	urls: ReadonlyMap<string, string>;
	inGuide: (pageId: string) => boolean;
}): HrefResolver {
	return (href) => {
		const fileId = fileIdOf(href);
		if (fileId) return urls.get(fileId);
		const pageId = pageIdOf(href);
		if (pageId) return inGuide(pageId) ? `guide:${pageId}` : undefined;
		return typeof href === 'string' ? href : undefined;
	};
}

function withAttr({ node, key, resolve }: { node: GuideNode; key: string; resolve: HrefResolver }) {
	const value = resolve(node.attrs?.[key]);
	return value ? { ...node, attrs: { ...node.attrs, [key]: value } } : null;
}

function resolveMarks({ marks, resolve }: { marks: GuideMark[]; resolve: HrefResolver }) {
	return marks.flatMap((mark) => {
		if (mark.type !== 'link') return [mark];
		const href = resolve(mark.attrs?.href);
		return href ? [{ ...mark, attrs: { ...mark.attrs, href } }] : [];
	});
}

/** The resolved document and its headings. */
export function resolveDocument({ doc, resolve }: { doc: GuideDocument; resolve: HrefResolver }) {
	const headings = headingsOf(doc);
	const anchors = headings.map((heading) => heading.id);
	const content = mapNodes(doc, (node): GuideNode | null => {
		switch (node.type) {
			case 'heading':
			case 'discussionPoints':
				// as headingsOf: an empty heading is not in the table of contents and takes no anchor
				return headingTextOf(node)
					? { ...node, attrs: { ...node.attrs, id: anchors.shift() } }
					: node;
			case 'image':
				return withAttr({ node, key: 'src', resolve });
			case 'button':
				return withAttr({ node, key: 'href', resolve });
			default:
				return node.marks ? { ...node, marks: resolveMarks({ marks: node.marks, resolve }) } : node;
		}
	});
	return { content, headings };
}
