import {
	elementsByShape,
	elementsOf,
	POINTS_PER_MM,
	type LayoutDocument
} from '#lib/helpers/documentLayout';
import {
	breaksReading,
	layoutExtents,
	layoutOverlaps,
	type Extent
} from '#lib/helpers/layoutExtents';
import type { Picture } from '#lib/paperScan/markers';
import { pageAreas, POSTAL_DOCUMENTS, type PostalDocument } from '#lib/paperScan/pageAreas';
import { inkIn, readAreas } from '#lib/paperScan/readPaper';

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

type RenderedPage = { width: number; height: number; perMm: number; picture: Picture };

/**
 * What would make the printed paper hard or impossible to read: two parts over each other
 * (`overlap`), or a part over the template's own print (`onPrint`, a field has its own check for
 * that). `breaks`: a machine could not read it any more (a code, a mark or a field is in it);
 * otherwise it only reads badly to a person.
 */
export type LayoutProblem = {
	kind: 'overlap' | 'onPrint';
	ids: string[];
	breaks: boolean;
};

/** Ink darker than the paper on more than this share of a part's area: the template prints there. */
const PRINT_UNDER = 0.004;

/** Whether the template's page `rendered` prints under `extent` (a code, or its caption). */
function printsUnder({ extent, rendered }: { extent: Extent; rendered: RenderedPage }) {
	const toMm = { x: rendered.width / POINTS_PER_MM, y: rendered.height / POINTS_PER_MM };
	return extent.rects.some(
		(rect) =>
			inkIn({
				picture: rendered.picture,
				toPicture: ({ x, y }) => ({ x: x * rendered.perMm, y: y * rendered.perMm }),
				box: {
					x: rect.x * toMm.x,
					y: rect.y * toMm.y,
					width: rect.width * toMm.x,
					height: rect.height * toMm.y
				}
			}).ink > PRINT_UNDER
	);
}

/**
 * The problems of `layout` as the layout editor shows them beside the page: overlaps between its
 * parts, and parts over the template's print on `pictures` (none until those are there). Texts
 * and codes are measured with `lines`, the sample the editor shows.
 */
export function checkLayout({
	document,
	layout,
	pictures,
	lines
}: {
	document: LayoutDocument;
	layout: Layout;
	pictures: readonly RenderedPage[];
	lines: (id: string) => readonly string[];
}): LayoutProblem[] {
	const page = pictures.at(0) ?? { width: 595.28, height: 841.89 };
	const extents = layoutExtents({ document, layout, page, lines });
	const problems: LayoutProblem[] = layoutOverlaps(extents).map((pair) => ({
		kind: 'overlap',
		ids: [pair.a.id, pair.b.id],
		breaks: breaksReading(pair)
	}));
	for (const extent of extents) {
		if (extent.fixed || extent.shape === 'field') continue;
		const pages = extent.page === 'every' ? pictures : pictures.slice(extent.page, extent.page + 1);
		if (pages.some((rendered) => printsUnder({ extent, rendered }))) {
			problems.push({ kind: 'onPrint', ids: [extent.id], breaks: extent.shape === 'square' });
		}
	}
	return problems;
}
