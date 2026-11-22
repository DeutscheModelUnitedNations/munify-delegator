import { rgb, type PDFPage } from 'pdf-lib';
import { POINTS_PER_MM } from '#lib/helpers/documentLayout';
import { MARKER, type Point } from './markerGeometry';
import { markerCells, MARKER_CELLS } from './markers';
import { pageAreas, type PostalDocument } from './pageAreas';

/**
 * What a page of the application documents carries to be read off a scan, drawn into it with
 * pdf-lib (`#lib/utils/pdfGenerator` calls it for every main page where the conference reads its
 * paper): its alignment marks, nothing else. The fields are only where a scan is read: each sits on
 * the template's own box or line, and nothing is drawn for it.
 */

/**
 * The alignment marks (`./markers`) centred at `centers` (millimetres), each on white a cell wider
 * than it, so whatever the template has there does not touch it.
 */
function drawAlignmentMarks({ page, centers }: { page: PDFPage; centers: Point[] }) {
	const { height } = page.getSize();
	const cell = (MARKER.side / MARKER_CELLS) * POINTS_PER_MM;
	const side = MARKER_CELLS * cell;
	for (const [corner, center] of centers.entries()) {
		const left = center.x * POINTS_PER_MM - side / 2;
		const top = height - center.y * POINTS_PER_MM + side / 2;
		page.drawRectangle({
			x: left - cell,
			y: top - side - cell,
			width: side + 2 * cell,
			height: side + 2 * cell,
			color: rgb(1, 1, 1)
		});
		markerCells(corner).forEach((row, r) => {
			row.forEach((black, c) => {
				if (!black) return;
				// a hair larger, so no seam shows between neighbouring cells
				page.drawRectangle({
					x: left + c * cell,
					y: top - (r + 1) * cell - 0.02,
					width: cell + 0.02,
					height: cell + 0.02,
					color: rgb(0, 0, 0)
				});
			});
		});
	}
}

/** Draws the alignment marks of page `pageIndex` (from 0) of a `document`'s template as `layout` places them. */
export function drawPaperPage({
	page,
	document,
	layout,
	pageIndex
}: {
	page: PDFPage;
	document: PostalDocument;
	layout: Parameters<typeof pageAreas>[0]['layout'];
	pageIndex: number;
}) {
	const { width, height } = page.getSize();
	const { markers } = pageAreas({
		document,
		layout,
		page: pageIndex,
		size: { width, height }
	});
	drawAlignmentMarks({ page, centers: markers });
}
