import { elementsByShape, elementsOf } from '#lib/helpers/documentLayout';
import type { Picture } from '#lib/paperScan/markers';
import { pageAreas, POSTAL_DOCUMENTS, type PostalDocument } from '#lib/paperScan/pageAreas';
import { readAreas } from '#lib/paperScan/readPaper';

/**
 * What the layout editor tells about each field as it is placed: read off the blank template as a
 * scan would be, it must come out empty. `free`: it does; `unclear`: the template's own print
 * touches it, so a scan may be left to a person; `filled`: the template's print alone already
 * reads as ticked or written, so an empty form would count as filled in. `unknown` until the
 * template's page is there.
 */
export type FieldCheck = 'free' | 'unclear' | 'filled' | 'unknown';

const VERDICT = { no: 'free', unclear: 'unclear', yes: 'filled' } as const;

const isPostal = (document: string): document is PostalDocument =>
	POSTAL_DOCUMENTS.some((postal) => postal === document);

type Layout = Parameters<typeof pageAreas>[0]['layout'];

/** How many pages of the template the layout's fields are on, counted to the last one. */
function pagesWithFields({ document, layout }: { document: PostalDocument; layout: Layout }) {
	const { fields } = elementsByShape({
		elements: elementsOf(document),
		layout
	});
	return Math.max(0, ...fields.map(({ placement }) => placement.page + 1));
}

/**
 * The check of every field of `layout` on `pictures`, the template's pages rendered `perMm` pixels
 * to the millimetre (`templatePictures`), by element id; none for a document without fields.
 */
export function checkFields({
	document,
	layout,
	pictures
}: {
	document: string;
	layout: Layout;
	pictures: readonly { width: number; height: number; perMm: number; picture: Picture }[];
}): Record<string, FieldCheck> {
	if (!isPostal(document)) return {};
	const checks: Record<string, FieldCheck> = {};
	for (let page = 0; page < pagesWithFields({ document, layout }); page++) {
		const rendered = pictures.at(page);
		const { areas } = pageAreas({
			document,
			layout,
			page,
			size: rendered ?? { width: 595, height: 842 }
		});
		if (!rendered) {
			// not on the template (yet): nothing to read it off
			for (const { field } of areas) checks[field] = 'unknown';
			continue;
		}
		const { perMm, picture } = rendered;
		const readings = readAreas({
			picture,
			toPicture: ({ x, y }) => ({ x: x * perMm, y: y * perMm }),
			areas
		});
		for (const { field, state } of readings) checks[field] = VERDICT[state];
	}
	return checks;
}
