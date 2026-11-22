// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { defaultLayout } from '#lib/helpers/documentLayout';
import { PAPER_FIELDS } from '#lib/paperScan/fields';
import { MARKER } from '#lib/paperScan/markerGeometry';
import { pageAreas, POSTAL_DOCUMENTS } from '#lib/paperScan/pageAreas';
import { readAreas } from '#lib/paperScan/readPaper';
import { pdfText, renderPdfPage } from '#lib/paperScan/scanSimulation';

// The layout's defaults put every field where DMUN's own forms (the seed's templates) have it, and
// the alignment marks where those forms have nothing: a field off its box or line, or a mark over
// the banner, means the defaults or the forms moved.

const template = (name: string) =>
	new Uint8Array(readFileSync(fileURLToPath(new URL(`./templates/${name}.pdf`, import.meta.url))));

const PAGES = { contract: 1, guardianConsent: 1, mediaConsent: 3 } as const;
const DPI = 100;

describe.each(POSTAL_DOCUMENTS)("DMUN's %s", (document) => {
	const bytes = template(document);

	test.each(Array.from({ length: PAGES[document] }, (_, page) => page))(
		'page %i: every field on its box or line',
		async (page) => {
			const { texts, size } = await pdfText({ bytes, page });
			const { areas } = pageAreas({ document, layout: defaultLayout(document), page, size });
			for (const area of areas) {
				if (PAPER_FIELDS[area.field].mark === 'checkbox') {
					// the form's ☐ (or ◯) where the box is
					const glyph = texts.find(
						(text) =>
							/[☐◯]/.test(text.text) &&
							Math.abs(text.x - area.x) < 1 &&
							text.baseline > area.y &&
							text.baseline < area.y + area.height + 1
					);
					expect(glyph, area.field).toBeDefined();
				} else {
					// the form's underscores under most of the field, its bottom on their line
					const right = area.x + area.width;
					const line = texts.find(
						(text) =>
							text.text.includes('___') &&
							Math.min(right, text.x + text.width) - Math.max(area.x, text.x) > 0.8 * area.width &&
							Math.abs(text.baseline - (area.y + area.height)) < 1.5
					);
					expect(line, area.field).toBeDefined();
				}
			}
		}
	);

	test.each(Array.from({ length: PAGES[document] }, (_, page) => page))(
		'page %i: the empty form reads empty, field by field',
		async (page) => {
			const { size } = await pdfText({ bytes, page });
			const perMm = 6;
			const picture = await renderPdfPage({ bytes, page, dpi: perMm * 25.4 });
			const { areas } = pageAreas({ document, layout: defaultLayout(document), page, size });
			const readings = readAreas({
				picture,
				toPicture: ({ x, y }) => ({ x: x * perMm, y: y * perMm }),
				areas
			});
			for (const { field, state } of readings) expect(state, field).toBe('no');
		}
	);

	test.each(Array.from({ length: PAGES[document] }, (_, page) => page))(
		'page %i: the alignment marks on blank paper',
		async (page) => {
			const picture = await renderPdfPage({ bytes, page, dpi: DPI });
			const { markers } = pageAreas({
				document,
				layout: defaultLayout(document),
				page,
				size: { width: (picture.width * 72) / DPI, height: (picture.height * 72) / DPI }
			});
			const perMm = DPI / 25.4;
			// the mark and the white cell around it
			const reach = (MARKER.side / 2 + 1) * perMm;
			for (const { x, y } of markers) {
				for (let py = Math.floor(y * perMm - reach); py < y * perMm + reach; py++) {
					for (let px = Math.floor(x * perMm - reach); px < x * perMm + reach; px++) {
						const at = (py * picture.width + px) * 4;
						const value = Math.min(picture.data[at], picture.data[at + 1], picture.data[at + 2]);
						expect(value, `mark at ${x}/${y} mm`).toBeGreaterThan(200);
					}
				}
			}
		}
	);
});
