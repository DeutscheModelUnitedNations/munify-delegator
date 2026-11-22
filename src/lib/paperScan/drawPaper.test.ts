// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { defaultLayout } from '#lib/helpers/documentLayout';
import { drawPaperPage } from './drawPaper';
import { findMarkers } from './markers';
import { pageAreas } from './pageAreas';
import { renderPdfPage, type Pixels } from './scanSimulation';

const A4 = { width: 595.28, height: 841.89 };
const DPI = 150;
const perMm = DPI / 25.4;

/** A blank A4 page with what `drawPaperPage` draws for the contract, rendered. */
async function drawnContract() {
	const pdf = await PDFDocument.create();
	const page = pdf.addPage([A4.width, A4.height]);
	drawPaperPage({ page, document: 'contract', layout: defaultLayout('contract'), pageIndex: 0 });
	return renderPdfPage({ bytes: await pdf.save(), dpi: DPI });
}

/** The darkest pixel in a box of the picture, given in millimetres. */
function darkest({
	picture,
	box
}: {
	picture: Pixels;
	box: { x: number; y: number; width: number; height: number };
}) {
	let value = 255;
	for (let y = Math.floor(box.y * perMm); y <= (box.y + box.height) * perMm; y++) {
		for (let x = Math.floor(box.x * perMm); x <= (box.x + box.width) * perMm; x++) {
			value = Math.min(value, picture.data[(y * picture.width + x) * 4]);
		}
	}
	return value;
}

describe('drawPaperPage', () => {
	test('puts the four marks where the page data says, and they are found again', async () => {
		const picture = await drawnContract();
		const { markers } = pageAreas({
			document: 'contract',
			layout: defaultLayout('contract'),
			page: 0,
			size: A4
		});
		const found = findMarkers(picture);
		expect(found).not.toBeNull();
		found?.forEach((center, corner) => {
			expect(center.x / perMm).toBeCloseTo(markers[corner].x, 0);
			expect(center.y / perMm).toBeCloseTo(markers[corner].y, 0);
		});
	});

	test('draws nothing for the fields, boxes to tick included: they are only read', async () => {
		const picture = await drawnContract();
		const { areas } = pageAreas({
			document: 'contract',
			layout: defaultLayout('contract'),
			page: 0,
			size: A4
		});
		for (const area of areas) {
			expect(darkest({ picture, box: area }), area.field).toBe(255);
		}
	});
});
