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

/** The layout's alignment marks, corner by corner clockwise from the top left. */
const MARKER_ELEMENTS = [
	'markerTopLeft',
	'markerTopRight',
	'markerBottomRight',
	'markerBottomLeft'
] as const;

type Layout = Parameters<typeof elementsByShape>[0]['layout'];

/**
 * What a page of a `document`'s template (`page` from 0, `size` in points) carries, as `layout`
 * places it, in millimetres: its alignment marks' centres and its fields. What the page's printed
 * code says (`encodeAreas`), and where the PDF generator draws.
 */
export function pageAreas({
	document,
	layout,
	page,
	size
}: {
	document: PostalDocument;
	layout: Layout;
	page: number;
	size: { width: number; height: number };
}): PageAreas {
	const width = size.width / POINTS_PER_MM;
	const height = size.height / POINTS_PER_MM;
	const { fields } = elementsByShape({
		elements: elementsOf(document, { scanning: true }),
		layout
	});
	const markers = MARKER_ELEMENTS.map((id) => {
		const mark = layout[id];
		const box = mark && 'width' in mark ? mark : { x: 0, y: 0, width: 0, height: 0 };
		return { x: (box.x + box.width / 2) * width, y: (box.y + box.height / 2) * height };
	});
	return {
		page: { width, height },
		markers,
		areas: fields
			.filter(({ placement }) => placement.page === page)
			.map(({ field, placement }) => ({
				field,
				x: placement.x * width,
				y: placement.y * height,
				width: placement.width * width,
				height: placement.height * height
			}))
	};
}
