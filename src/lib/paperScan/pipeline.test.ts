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
import { penOn, renderPdfPage, simulateScan } from './scanSimulation';

// A page of DMUN's own forms, printed with its marks, filled in by pen, scanned the ways scans
// come back, and read: what `readPaper` says must be what was written.

const template = (document: PostalDocument) =>
	readFileSync(
		fileURLToPath(new URL(`../../api/db/seed-data/templates/${document}.pdf`, import.meta.url))
	);

/**
 * The scans a page is read from: straight, a home print scanned crooked, and upside down, at 150
 * dpi, the least a scanner is set to.
 */
const SCANS = [
	{ name: 'straight', dpi: 150, scan: {} },
	{ name: 'crooked', dpi: 150, scan: { angle: 1.6, scale: 0.96, noise: 30 } },
	{ name: 'upside down', dpi: 150, scan: { flipped: true, angle: -0.8, noise: 20 } }
] as const;

/**
 * Page `page` of `document`'s template with what the generator draws for it, filled in: the
 * fields of `filled` ticked or written in.
 */
async function filledPage({
	document,
	page,
	filled
}: {
	document: PostalDocument;
	page: number;
	filled: readonly PaperField[];
}) {
	const source = await PDFDocument.load(template(document));
	const pdf = await PDFDocument.create();
	const [copy] = await pdf.copyPages(source, [page]);
	pdf.addPage(copy);
	const layout = defaultLayout(document);
	drawPaperPage({ page: copy, document, layout, pageIndex: page });
	const size = copy.getSize();
	const { areas } = pageAreas({ document, layout, page, size });
	const pen = penOn(copy);
	for (const area of areas.filter(({ field }) => filled.includes(field))) {
		if (area.width < 10) pen.cross(area);
		else pen.write({ x: area.x + 2, line: area.y + area.height, length: area.width * 0.6 });
	}
	return { bytes: await pdf.save(), areas: pageAreas({ document, layout, page, size }) };
}

describe.each(SCANS)('a $name scan', ({ dpi, scan }) => {
	test('of the contract, filled in, is read as filled in', { timeout: 30_000 }, async () => {
		const { bytes, areas } = await filledPage({
			document: 'contract',
			page: 0,
			filled: ['termsAccepted', 'termsPlaceDate', 'termsSignature']
		});
		const picture = simulateScan({ picture: await renderPdfPage({ bytes, dpi }), ...scan });
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
		const picture = simulateScan({ picture: await renderPdfPage({ bytes, dpi }), ...scan });
		expect(readPaper({ picture, areas })?.map(({ state }) => state)).toEqual(['no', 'no', 'no']);
	});

	test("of the media consent's purposes reads each box", { timeout: 30_000 }, async () => {
		const ticked = ['mediaInternal', 'mediaPress', 'mediaSocial', 'mediaAdvertising'] as const;
		const { bytes, areas } = await filledPage({
			document: 'mediaConsent',
			page: 1,
			filled: ticked
		});
		const picture = simulateScan({ picture: await renderPdfPage({ bytes, dpi }), ...scan });
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
			const picture = simulateScan({ picture: await renderPdfPage({ bytes, dpi }), ...scan });
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
