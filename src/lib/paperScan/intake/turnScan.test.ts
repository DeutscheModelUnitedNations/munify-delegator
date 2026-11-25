// @vitest-environment node
import { createCanvas, ImageData, loadImage, type Canvas } from '@napi-rs/canvas';
import { degrees, PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, test } from 'vitest';
import { defaultLayout } from '#lib/helpers/documentLayout';
import { signClaims } from '#lib/signedCode/signedCode';
import { drawPaperPage } from '../drawPaper';
import { renderPdfPage, simulateScan } from '../scanSimulation';
import { readScanPage, type ScanPlatform } from './pages';
import type { ScanFileType } from './scanFile';
import { turnScan } from './turnScan';

// A page scanned whichever way round is kept upright: read (with the app's own reading, the code aside,
// which is found whichever way it lies), turned, and then read as upright.

const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
/** The code of a page without fields, which has marks all the same. */
const code = await signClaims({
	claims: { kind: 'print', userId: 'ada', conferenceId: 'mun', issuedAt: 1 },
	kid: 1,
	sign: async (bytes) => new Uint8Array(await crypto.subtle.sign('Ed25519', pair.privateKey, bytes))
});

const platform = (text: string): ScanPlatform<Canvas> => ({
	openPdf: (data) => pdfjs.getDocument({ data }),
	async openImage({ bytes }) {
		const image = await loadImage(Buffer.from(bytes));
		return {
			width: image.width,
			height: image.height,
			drawOn: (canvas) =>
				canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height),
			close: () => undefined
		};
	},
	createCanvas: ({ width, height }) => createCanvas(width, height),
	releaseCanvas: () => undefined,
	// TYPE-SAFETY-EXCEPTION: pdf.js renders into any canvas with a 2D context; it is typed for the
	// browser's, and Node's (@napi-rs/canvas) is the one it uses there.
	forPdf: (canvas) => canvas as unknown as HTMLCanvasElement,
	pictureOf: (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height),
	readCodes: async () => [{ rawValue: text, format: 'qr_code' }]
});

const read = ({
	bytes,
	type,
	text = code
}: {
	bytes: Uint8Array<ArrayBuffer>;
	type: ScanFileType;
	text?: string;
}) => readScanPage({ scan: { bytes, type }, platform: platform(text) });

/** A page with its marks, laid in by so many quarter turns, as a scanner's file of it. */
async function scanned({ quarters, type }: { quarters: number; type: ScanFileType }) {
	const pdf = await PDFDocument.create();
	const page = pdf.addPage([595.28, 841.89]);
	drawPaperPage({ page, document: 'contract', layout: defaultLayout('contract'), pageIndex: 0 });
	const picture = simulateScan({
		picture: await renderPdfPage({ bytes: await pdf.save(), dpi: 100 }),
		quarters,
		angle: 1,
		noise: 10
	});
	const { width, height } = picture;
	const canvas = createCanvas(width, height);
	canvas
		.getContext('2d')
		.putImageData(new ImageData(new Uint8ClampedArray(picture.data), width, height), 0, 0);
	if (type === 'image/png') return new Uint8Array(canvas.toBuffer('image/png'));
	const jpeg = new Uint8Array(canvas.toBuffer('image/jpeg', 90));
	if (type === 'image/jpeg') return jpeg;
	return pdfOf({ jpeg, width, height });
}

async function pdfOf({
	jpeg,
	width,
	height,
	rotate = 0
}: {
	jpeg: Uint8Array;
	width: number;
	height: number;
	rotate?: number;
}) {
	const pdf = await PDFDocument.create();
	const page = pdf.addPage([width * 0.72, height * 0.72]);
	page.drawImage(await pdf.embedJpg(jpeg), { x: 0, y: 0, ...page.getSize() });
	page.setRotation(degrees(rotate));
	return new Uint8Array(await pdf.save());
}

describe.each(['application/pdf', 'image/jpeg', 'image/png'] as const)('a page as %s', (type) => {
	test('lying upright stays the file it is', { timeout: 30_000 }, async () => {
		expect(
			(await read({ bytes: await scanned({ quarters: 0, type }), type })).upright
		).toBeUndefined();
	});

	test.each([1, 2, 3])(
		'turned by %i quarters is kept upright',
		{ timeout: 30_000 },
		async (quarters) => {
			const { upright } = await read({ bytes: await scanned({ quarters, type }), type });
			if (!upright) throw new Error('not turned');
			// browsers go by a PNG's Exif, Node's canvas does not (`turnPicture.test.ts` looks at it)
			if (type !== 'image/png')
				expect((await read({ bytes: upright, type })).upright).toBeUndefined();
		}
	);
});

describe('turning a page', () => {
	test('goes on from how a PDF says it lies', { timeout: 30_000 }, async () => {
		const { width, height } = await loadImage(
			Buffer.from(await scanned({ quarters: 1, type: 'image/jpeg' }))
		);
		const jpeg = await scanned({ quarters: 1, type: 'image/jpeg' });
		const type = 'application/pdf';
		const shownUpright = await pdfOf({ jpeg, width, height, rotate: 270 });
		expect((await read({ bytes: shownUpright, type })).upright).toBeUndefined();
		const upsideDown = await pdfOf({ jpeg, width, height, rotate: 90 });
		const { upright } = await read({ bytes: upsideDown, type });
		if (!upright) throw new Error('not turned');
		expect((await PDFDocument.load(upright)).getPage(0).getRotation().angle).toBe(270);
	});

	test('is left where no code of ours is on it', { timeout: 30_000 }, async () => {
		const type = 'image/jpeg';
		const bytes = await scanned({ quarters: 2, type });
		expect((await read({ bytes, type, text: 'https://example.org' })).upright).toBeUndefined();
	});

	test('leaves a file that cannot be turned', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		for (const type of ['application/pdf', 'image/webp'] as const) {
			expect(await turnScan({ scan: { bytes, type }, turn: 2 })).toBeUndefined();
		}
	});
});
