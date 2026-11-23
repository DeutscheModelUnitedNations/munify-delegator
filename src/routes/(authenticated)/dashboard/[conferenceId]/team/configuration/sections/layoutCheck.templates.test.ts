// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { defaultLayout } from '#lib/helpers/documentLayout';
import { POSTAL_DOCUMENTS } from '#lib/paperScan/pageAreas';
import { renderPdfPage } from '#lib/paperScan/scanSimulation';
import { checkLayout } from './layoutCheck';
import { elementSample, type WrittenElement } from './layoutElements';

// DMUN's own forms (the seed's templates) with the default layouts: nothing over anything, nothing
// over the forms' print. A part moved onto the forms' text is told.

const PER_MM = 4;
const PAGES = { contract: 1, guardianConsent: 1, mediaConsent: 3 } as const;

const template = (name: string) =>
	new Uint8Array(
		readFileSync(
			fileURLToPath(
				new URL(`../../../../../../../api/db/seed-data/templates/${name}.pdf`, import.meta.url)
			)
		)
	);

async function pictures(document: keyof typeof PAGES) {
	const bytes = template(document);
	return Promise.all(
		Array.from({ length: PAGES[document] }, async (_, page) => {
			const picture = await renderPdfPage({ bytes, page, dpi: PER_MM * 25.4 });
			const toPoints = 72 / (PER_MM * 25.4);
			return {
				width: picture.width * toPoints,
				height: picture.height * toPoints,
				perMm: PER_MM,
				picture
			};
		})
	);
}

/** The samples the editor shows. */
const isWritten = (id: string): id is WrittenElement => Object.hasOwn(elementSample, id);
const lines = (id: string) => (isWritten(id) ? elementSample[id]() : []);

describe.each(POSTAL_DOCUMENTS)("DMUN's %s with the default layout", (document) => {
	test('has no problems', { timeout: 30_000 }, async () => {
		const problems = checkLayout({
			document,
			layout: defaultLayout(document),
			pictures: await pictures(document),
			lines
		});
		expect(problems).toEqual([]);
	});
});

test("a code moved onto the form's text breaks reading", { timeout: 30_000 }, async () => {
	const layout = defaultLayout('contract');
	const problems = checkLayout({
		document: 'contract',
		layout: { ...layout, code: { ...layout.code, x: 0.45, y: 0.55 } },
		pictures: await pictures('contract'),
		lines
	});
	expect(problems).toContainEqual({ kind: 'onPrint', ids: ['code'], breaks: true });
});
