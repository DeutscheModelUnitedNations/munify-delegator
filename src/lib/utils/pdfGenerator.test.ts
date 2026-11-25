// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { readBarcodes } from 'zxing-wasm/reader';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { findMarkers } from '#lib/paperScan/markers';
import type { PrintedPage } from '#lib/paperScan/pageAreas';
import { CODE_CAPTION } from '#lib/helpers/codeCaption';
import { defaultLayout, POINTS_PER_MM, withHidden } from '#lib/helpers/documentLayout';
import { pdfText, renderPdfPage, type Pixels } from '#lib/paperScan/scanSimulation';

// The postal registration as the generator builds it from DMUN's templates: one signed code per
// page, the pages in order, and on the main pages the alignment marks and the boxes.

const downloads: Uint8Array[] = [];
vi.mock('#lib/utils/downloadHelpers', () => ({
	downloadPDF: ({ bytes }: { bytes: Uint8Array }) => downloads.push(bytes)
}));

/**
 * The browser the generator runs in, while it runs: its origin, and the fonts as the app serves
 * them. Only then: pdf.js, rendering the result, takes a `window` for a browser's.
 */
function asInTheBrowser() {
	vi.stubGlobal('window', {
		location: { origin: 'https://delegator.test', href: 'https://delegator.test/' }
	});
	vi.stubGlobal('fetch', async (path: string) => {
		const file = readFileSync(fileURLToPath(new URL(`../../../static${path}`, import.meta.url)));
		return new Response(file);
	});
}

/** The generator's pages rendered as the browser would, to measure the print in their fields. */
vi.mock('#lib/helpers/pdfPages', () => ({
	templatePictures: async ({ source }: { source: { data: Uint8Array } }) => {
		vi.unstubAllGlobals();
		const perMm = 6;
		const count = (await PDFDocument.load(source.data)).getPageCount();
		const pictures = await Promise.all(
			Array.from({ length: count }, (_, page) =>
				renderPdfPage({ bytes: source.data, page, dpi: perMm * 25.4 })
			)
		);
		asInTheBrowser();
		return pictures.map((picture) => ({ width: 596, height: 842, perMm, picture }));
	}
}));

const { downloadCompletePostalRegistrationPDF } = await import('./pdfGenerator');

const dataUrl = (name: string) => {
	const file = readFileSync(
		fileURLToPath(new URL(`../../api/db/seed-data/templates/${name}.pdf`, import.meta.url))
	);
	return { url: `data:application/pdf;base64,${file.toString('base64')}` };
};

/** Generates the documents; answers the PDF and the pages the codes were asked for. */
async function generate({
	isOfAge,
	documentLayouts = null
}: {
	isOfAge: boolean;
	documentLayouts?: unknown;
}) {
	const asked: PrintedPage[][] = [];
	asInTheBrowser();
	await downloadCompletePostalRegistrationPDF({
		isOfAge,
		participant: {
			id: 'user-ada',
			name: 'ADA LOVELACE',
			address: 'St James Square 12, London',
			birthday: '10.12.2010'
		},
		recipient: { name: 'DMUN', address: 'Birkenweg 1', zip: '24235', city: 'Laboe', country: 'DE' },
		issueCodes: async (pages) => {
			asked.push(pages);
			return pages.map((_, index) => `PAGE${index}CODE`);
		},
		templates: {
			contractFile: dataUrl('contract'),
			guardianConsentFile: dataUrl('guardianConsent'),
			mediaConsentFile: dataUrl('mediaConsent'),
			termsAndConditionsFile: dataUrl('termsAndConditions'),
			documentLayouts
		}
	});
	vi.unstubAllGlobals();
	const bytes = downloads.at(-1);
	if (!bytes) throw new Error('nothing downloaded');
	return { bytes, asked };
}

/** The text of the QR codes in a picture. */
async function qrCodesIn(picture: Pixels) {
	const canvas = createCanvas(picture.width, picture.height);
	const context = canvas.getContext('2d');
	const image = context.createImageData(picture.width, picture.height);
	image.data.set(picture.data);
	context.putImageData(image, 0, 0);
	const found = await readBarcodes(new Uint8Array(canvas.encodeSync('png')), {
		formats: ['QRCode']
	});
	return found.map(({ text }) => text);
}

beforeEach(() => {
	downloads.length = 0;
});

describe('the postal registration documents', () => {
	test(
		"ask one code per main page, a minor's with the guardians' consent, in order",
		{
			timeout: 60_000
		},
		async () => {
			const { bytes, asked } = await generate({ isOfAge: false });
			expect(asked).toHaveLength(1);
			expect(asked[0].map(({ document, page }) => [document, page])).toEqual([
				['contract', 0],
				['guardianConsent', 0],
				['mediaConsent', 0],
				['mediaConsent', 1],
				['mediaConsent', 2]
			]);
			asked[0].forEach(({ width, height }) => {
				expect(width).toBeCloseTo(596, 0);
				expect(height).toBeCloseTo(842, 0);
			});
			// the id below the code, the name below the id
			const { texts } = await pdfText({ bytes, page: 1 });
			const baseline = (line: string) => texts.findLast(({ text }) => text === line)?.baseline;
			const id = baseline('user-ada') ?? NaN;
			expect((baseline('ADA LOVELACE') ?? NaN) - id).toBeCloseTo(CODE_CAPTION.step / POINTS_PER_MM);
			// the five main pages and the four of the terms
			expect((await PDFDocument.load(bytes)).getPageCount()).toBe(9);

			// each page carries its own code
			const fourth = await renderPdfPage({ bytes, page: 3, dpi: 200 });
			expect(await qrCodesIn(fourth)).toEqual(['HTTPS://DELEGATOR.TEST/ID/PAGE3CODE']);
		}
	);

	test(
		'tell the print in their fields: none on the forms as they are, a text put over one',
		{ timeout: 60_000 },
		async () => {
			const printedOn = async (documentLayouts: unknown) =>
				(await generate({ isOfAge: false, documentLayouts })).asked[0].map(
					({ printedInk }) => printedInk ?? []
				);
			expect((await printedOn(null)).flat()).toEqual([]);
			const layout = defaultLayout('contract');
			const { termsSignature } = layout;
			const [contract] = await printedOn({
				contract: {
					...layout,
					name: { ...layout.name, x: termsSignature.x, y: termsSignature.y + 0.02 }
				}
			});
			const signature = contract.find(({ field }) => field === 'termsSignature');
			expect(signature?.ink).toBeGreaterThan(0.01);
		}
	);

	test('carry the marks on the main pages only', { timeout: 60_000 }, async () => {
		const read = await generate({ isOfAge: true });
		// an adult's: no guardians' consent
		expect(read.asked[0].map(({ document }) => document)).toEqual([
			'contract',
			'mediaConsent',
			'mediaConsent',
			'mediaConsent'
		]);
		expect(findMarkers(await renderPdfPage({ bytes: read.bytes, page: 0 }))).not.toBeNull();
		// the terms carry no marks
		expect(findMarkers(await renderPdfPage({ bytes: read.bytes, page: 4 }))).toBeNull();
	});

	test('leave out what the layout switches off, and only there', { timeout: 60_000 }, async () => {
		const layout = defaultLayout('contract');
		const off = (id: 'recipient' | 'birthday') =>
			withHidden({ placement: layout[id], hidden: true });
		const textOf = async (documentLayouts: unknown) => {
			const { bytes } = await generate({ isOfAge: true, documentLayouts });
			const pages = await Promise.all([0, 1].map((page) => pdfText({ bytes, page })));
			return pages.map(({ texts }) => texts.map(({ text }) => text).join('|'));
		};
		const [contract] = await textOf(null);
		expect(contract).toContain('10.12.2010');
		expect(contract).toContain('Birkenweg 1');

		const [switched, media] = await textOf({
			contract: { ...layout, recipient: off('recipient'), birthday: off('birthday') }
		});
		expect(switched).not.toContain('10.12.2010');
		expect(switched).not.toContain('Birkenweg 1');
		// the name stays, and the media consent keeps its birthday
		expect(switched).toContain('ADA LOVELACE');
		expect(media).toContain('10.12.2010');
	});
});
