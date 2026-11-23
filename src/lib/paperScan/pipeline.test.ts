// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { defaultLayout } from '#lib/helpers/documentLayout';
import { drawPaperPage } from './drawPaper';
import type { PaperField } from './fields';
import { pageAreas, type PostalDocument } from './pageAreas';
import { proposePaperChange } from './proposal';
import { readPaper } from './readPaper';
import type { Point } from './markerGeometry';
import { areasAsPrinted, type PaperArea } from './areas';
import { printedInkOf } from './printedInk';
import { penOn, renderPdfPage, simulatePhoto, simulateScan, type Pixels } from './scanSimulation';

// A page of DMUN's own forms, printed with its marks, filled in by pen, scanned the ways scans
// come back, and read: what `readPaper` says must be what was written.

const template = (document: PostalDocument) =>
	readFileSync(
		fileURLToPath(new URL(`../../api/db/seed-data/templates/${document}.pdf`, import.meta.url))
	);

type Distortion = (picture: Pixels) => Pixels;

/**
 * The scans a page is read from: straight, a home print scanned crooked, and upside down, at 150
 * dpi, the least a scanner is set to; and a phone's photos, in a shadow, out of focus, noisy, with a
 * thumb on a corner.
 */
const SCANS: { name: string; dpi: number; scan: Distortion }[] = [
	{ name: 'straight', dpi: 150, scan: (picture) => simulateScan({ picture }) },
	{
		name: 'crooked',
		dpi: 150,
		scan: (picture) => simulateScan({ picture, angle: 1.6, scale: 0.96, noise: 30 })
	},
	{
		name: 'upside down',
		dpi: 150,
		scan: (picture) => simulateScan({ picture, flipped: true, angle: -0.8, noise: 20 })
	},
	{
		name: 'shadowed',
		dpi: 100,
		scan: (picture) => simulatePhoto({ picture, tilt: 0.04, shadow: 0.7, noise: 15 })
	},
	{
		name: 'blurred',
		dpi: 150,
		scan: (picture) => simulatePhoto({ picture, tilt: 0.03, blur: 1, noise: 15 })
	},
	{
		name: 'noisy',
		dpi: 150,
		scan: (picture) => simulatePhoto({ picture, tilt: 0.03, noise: 80 })
	},
	{
		name: 'partly covered',
		dpi: 150,
		scan: (picture) => simulatePhoto({ picture, tilt: 0.03, noise: 15, covered: [2] })
	}
];

/**
 * Page `page` of `document`'s template with what the generator draws for it, filled in: the
 * fields of `filled` ticked or written in.
 */
async function filledPage({
	document,
	page,
	filled,
	placed = (area) => area
}: {
	document: PostalDocument;
	page: number;
	filled: readonly PaperField[];
	/** Where a field was placed, instead of on the form's own box or line. */
	placed?: (area: PaperArea) => PaperArea;
}) {
	const source = await PDFDocument.load(template(document));
	const pdf = await PDFDocument.create();
	const [copy] = await pdf.copyPages(source, [page]);
	pdf.addPage(copy);
	const layout = defaultLayout(document);
	const size = copy.getSize();
	const onForm = pageAreas({ document, layout, page, size }).areas;
	const areas = onForm.map(placed);
	// what the form prints in its fields, as its code carries it
	const blank = await renderPdfPage({ bytes: await pdf.save(), dpi: 6 * 25.4 });
	const toPicture = ({ x, y }: Point) => ({ x: x * 6, y: y * 6 });
	const printedInk = printedInkOf({ picture: blank, toPicture, areas });
	drawPaperPage({ page: copy, document, layout, pageIndex: page });
	const pen = penOn(copy);
	for (const area of onForm.filter(({ field }) => filled.includes(field))) {
		if (area.width < 10) pen.cross(area);
		else pen.write({ x: area.x + 2, line: area.y + area.height, length: area.width * 0.6 });
	}
	return {
		bytes: await pdf.save(),
		areas: {
			...pageAreas({ document, layout, page, size }),
			areas: areasAsPrinted({ areas, printedInk })
		}
	};
}

describe.each(SCANS)('a $name scan', ({ dpi, scan }) => {
	test('of the contract, filled in, is read as filled in', { timeout: 30_000 }, async () => {
		const { bytes, areas } = await filledPage({
			document: 'contract',
			page: 0,
			filled: ['termsAccepted', 'termsPlaceDate', 'termsSignature']
		});
		const picture = scan(await renderPdfPage({ bytes, dpi }));
		const readings = readPaper({ picture, areas });
		expect(readings).toEqual([
			{ field: 'termsAccepted', state: 'yes' },
			{ field: 'termsPlaceDate', state: 'yes' },
			{ field: 'termsSignature', state: 'yes' }
		]);
		expect(
			proposePaperChange({
				readings: readings ?? [],
				status: {
					termsAndConditions: 'PENDING',
					guardianConsent: 'PENDING',
					mediaConsent: 'PENDING',
					mediaConsentStatus: 'NOT_SET'
				},
				confirm: false,
				minor: false
			}).change
		).toEqual({ termsAndConditions: 'DONE' });
	});

	test('of the contract, left blank, is read as empty', { timeout: 30_000 }, async () => {
		const { bytes, areas } = await filledPage({ document: 'contract', page: 0, filled: [] });
		const picture = scan(await renderPdfPage({ bytes, dpi }));
		expect(readPaper({ picture, areas })?.map(({ state }) => state)).toEqual(['no', 'no', 'no']);
	});

	test("of the media consent's purposes reads each box", { timeout: 30_000 }, async () => {
		const ticked = ['mediaInternal', 'mediaPress', 'mediaSocial', 'mediaAdvertising'] as const;
		const { bytes, areas } = await filledPage({
			document: 'mediaConsent',
			page: 1,
			filled: ticked
		});
		const picture = scan(await renderPdfPage({ bytes, dpi }));
		const readings = readPaper({ picture, areas });
		expect(readings).toHaveLength(8);
		for (const { field, state } of readings ?? []) {
			expect(state, field).toBe(ticked.some((tick) => tick === field) ? 'yes' : 'no');
		}
	});

	test(
		"of the media consent's last page tells the person's signature from the guardians'",
		{
			timeout: 30_000
		},
		async () => {
			const { bytes, areas } = await filledPage({
				document: 'mediaConsent',
				page: 2,
				filled: ['mediaPlaceDate', 'mediaSignature']
			});
			const picture = scan(await renderPdfPage({ bytes, dpi }));
			const readings = Object.fromEntries(
				(readPaper({ picture, areas }) ?? []).map(({ field, state }) => [field, state])
			);
			expect(readings).toEqual({
				mediaPlaceDate: 'yes',
				mediaSignature: 'yes',
				mediaGuardian1Name: 'no',
				mediaGuardian2Name: 'no',
				mediaGuardianPlaceDate: 'no',
				mediaGuardian1Signature: 'no',
				mediaGuardian2Signature: 'no'
			});
		}
	);
});

describe.each(SCANS)('placed a little off, in a $name scan', ({ dpi, scan }) => {
	const read = async (args: Parameters<typeof filledPage>[0]) => {
		const { bytes, areas } = await filledPage(args);
		const picture = scan(await renderPdfPage({ bytes, dpi }));
		return (readPaper({ picture, areas }) ?? []).map(({ field, state }) => [field, state]);
	};

	test('boxes with their frame inside are read by their middle', { timeout: 60_000 }, async () => {
		const ticked = ['mediaInternal', 'mediaPress', 'mediaSocial'] as const;
		const readings = await read({
			document: 'mediaConsent',
			page: 1,
			filled: ticked,
			placed: (area) => ({ ...area, x: area.x + 0.25, y: area.y + 0.25 })
		});
		expect(readings).toHaveLength(8);
		for (const [field, state] of readings) {
			expect(state, field).toBe(ticked.some((tick) => tick === field) ? 'yes' : 'no');
		}
	});

	test.each([2, 3, 4])(
		"lines %i mm too low are read above the form's line",
		{ timeout: 60_000 },
		async (low) => {
			const readings = await read({
				document: 'contract',
				page: 0,
				filled: ['termsPlaceDate'],
				placed: (area) =>
					area.field === 'termsAccepted' ? area : { ...area, height: area.height + low }
			});
			expect(readings).toEqual([
				['termsAccepted', 'no'],
				['termsPlaceDate', 'yes'],
				['termsSignature', 'no']
			]);
		}
	);
});

describe('a picture too poor to tell', () => {
	test.each([
		{ name: 'out of focus', scan: (picture: Pixels) => simulatePhoto({ picture, blur: 2 }) },
		{ name: 'very noisy', scan: (picture: Pixels) => simulatePhoto({ picture, noise: 140 }) }
	])('$name never says a field is empty', { timeout: 30_000 }, async ({ scan }) => {
		const { bytes, areas } = await filledPage({
			document: 'contract',
			page: 0,
			filled: ['termsAccepted', 'termsPlaceDate', 'termsSignature']
		});
		const readings = readPaper({ picture: scan(await renderPdfPage({ bytes, dpi: 100 })), areas });
		expect(readings?.map(({ state }) => state) ?? []).not.toContain('no');
	});

	test.each([
		{ covered: 0, ticked: ['mediaInternal', 'mediaPress', 'mediaSocial', 'mediaAdvertising'] },
		{ covered: 0, ticked: [] },
		{ covered: 1, ticked: [] },
		{ covered: 3, ticked: [] }
	] satisfies { covered: number; ticked: PaperField[] }[])(
		'in every way at once is never read wrong (corner $covered covered, $ticked.length ticked)',
		{ timeout: 30_000 },
		async ({ covered, ticked }) => {
			const { bytes, areas } = await filledPage({
				document: 'mediaConsent',
				page: 1,
				filled: ticked
			});
			const picture = simulatePhoto({
				picture: await renderPdfPage({ bytes, dpi: 150 }),
				tilt: 0.05,
				shadow: 0.6,
				blur: 1,
				noise: 15,
				covered: [covered]
			});
			const readings = readPaper({ picture, areas });
			expect(readings).toHaveLength(8);
			for (const { field, state } of readings ?? []) {
				const right = ticked.some((tick) => tick === field) ? 'yes' : 'no';
				expect([right, 'unclear'], field).toContain(state);
			}
		}
	);

	test('with two corners covered is not read at all', { timeout: 30_000 }, async () => {
		const { bytes, areas } = await filledPage({ document: 'contract', page: 0, filled: [] });
		const picture = await renderPdfPage({ bytes, dpi: 100 });
		expect(readPaper({ picture: simulatePhoto({ picture, covered: [0, 2] }), areas })).toBeNull();
	});
});
