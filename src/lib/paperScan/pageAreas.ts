import {
	elementsByShape,
	elementsOf,
	POINTS_PER_MM,
	type LayoutDocument
} from '#lib/helpers/documentLayout';
import type { PageAreas } from './areas';

/** The documents a participant signs and sends back, whose fields a scan is read for. */
export const POSTAL_DOCUMENTS = [
	'contract',
	'guardianConsent',
	'mediaConsent'
] as const satisfies readonly LayoutDocument[];
export type PostalDocument = (typeof POSTAL_DOCUMENTS)[number];

/** A page of the application documents: which document's template, which page of it, its size in points. */
export type PrintedPage = { document: PostalDocument; page: number; width: number; height: number };

/**
 * The fields `layout` puts on page `page` (from 0) of a `document`'s template, a page `size`
 * points large: what that page's printed code carries (`encodeAreas`), and where the PDF
 * generator draws the boxes and lines.
 */
export function pageAreas({
	document,
	layout,
	page,
	size
}: {
	document: PostalDocument;
	layout: Parameters<typeof elementsByShape>[0]['layout'];
	page: number;
	size: { width: number; height: number };
}): PageAreas {
	const { fields } = elementsByShape({
		elements: elementsOf(document, { scanning: true }),
		layout
	});
	return {
		page: { width: size.width / POINTS_PER_MM, height: size.height / POINTS_PER_MM },
		areas: fields
			.filter(({ placement }) => placement.page === page)
			.map(({ field, placement: { x, y, width, height } }) => ({ field, x, y, width, height }))
	};
}
